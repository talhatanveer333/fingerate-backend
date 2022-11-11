import { HttpException, Injectable } from '@nestjs/common';
import { getConnection, QueryRunner, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import bigDecimal from 'js-big-decimal';
import { Payment } from './payment.entity';
import { SurveyService } from '../survey/survey.service';
import { UsersService } from '../user/user.service';
import { User } from '../user/user.entity';
import { Survey } from '../survey/survey.entity';
import { PaymentStatus, PaymentType } from './common/payment.enums';
import { SurveyStatus } from './../survey/common/survey.enums';
import { ADMIN_EMAIL } from './../user/common/user.constants';
import dayjs from 'dayjs';
import { QueueJob, QueueName } from '../../modules/worker/common/worker.enums';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobAttempts } from '../../modules/sot/common/sot.enums';
import { RechargePaymentDto } from './common/payment.dtos';
import { CurrencyConverterService } from '../../utils/currencyconverter/currencyconverter.service';
import { TossService } from '../../utils/toss/toss.service';
import { SomToDollarRate } from './common/payment.constants';
import { WalletRecharge } from './walletrecharge.entity';
import { Order } from '../marketplace/order.entity';
import { StreakSize } from '../../modules/event/common/event.enums';
import { InjectRepository } from '@nestjs/typeorm';
import { SotService } from '../sot/sot.service';
import { Sot } from '../sot/sot.entity';
import { PendingProfit } from './pendingprofit.entity';
import { ISot } from 'modules/sot/common/sot.types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly surveyService: SurveyService,
    private readonly userService: UsersService,
    private readonly tossService: TossService,
    private readonly sotService: SotService,
    @InjectQueue(QueueName.DEFAULT)
    private readonly defaultQueue: Queue,
    @InjectRepository(PendingProfit)
    private readonly pendingProfitRepository: Repository<PendingProfit>,
  ) {}

  /** ******************************************************************************************************************/
  /*
  /*                                    Make Survey Payment
  /*
  /********************************************************************************************************************/
  /**  Make Survey Payment
   *
   * @param  surveyId
   * @CurrentUser user
   * @returns
   */
  public async makeSurveyPayment(surveyId: string, user: User) {
    try {
      const survey = await this.surveyService.getSurveyByIdAndInitiator(
        surveyId,
        user.uuid,
      );
      if (dayjs().unix() >= survey.endingDate) {
        throw new HttpException(
          {
            statusCode: ResponseCode.SURVEY_EXPIRED,
            message: ResponseMessage.SURVEY_EXPIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const userBalance = user.wallet.balance;
      const { totalPaymentAmount } = await this.surveyService.getSurveyPayments(
        survey,
      );
      if (userBalance < totalPaymentAmount) {
        throw new HttpException(
          {
            statusCode: ResponseCode.BALANCE_LESS_THAN_REQUIRED,
            message: ResponseMessage.BALANCE_LESS_THAN_REQUIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (survey.feePaid) {
        throw new HttpException(
          {
            statusCode: ResponseCode.PAYMENT_ALREADY_MAKE,
            message: ResponseMessage.PAYMENT_ALREADY_MAKE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.initSurveyPayment(survey, user, totalPaymentAmount);
      await this.addSurveyJobs(survey);
      return survey;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add Survey Jobs In Queue
   *
   * @param  survey
   * @return
   */
  async addSurveyJobs(survey: Survey) {
    const now = dayjs().unix();
    const startDelay = Number(
      new bigDecimal(survey.startingDate)
        .subtract(new bigDecimal(now))
        .multiply(new bigDecimal(1000))
        .getValue(),
    );
    const endDelay = Number(
      new bigDecimal(survey.endingDate)
        .subtract(new bigDecimal(now))
        .multiply(new bigDecimal(1000))
        .getValue(),
    );
    await this.defaultQueue.add(
      QueueJob.START_SURVEY,
      {
        surveyId: survey.uuid,
      },
      {
        delay: startDelay,
        removeOnComplete: true,
        attempts: JobAttempts.THREE,
      },
    );
    await this.defaultQueue.add(
      QueueJob.END_SURVEY,
      {
        surveyId: survey.uuid,
      },
      {
        delay: endDelay,
        removeOnComplete: true,
        attempts: JobAttempts.THREE,
      },
    );
    return;
  }

  /** Init Survey Payment transaction
   *
   * @param  surveyId
   * @CurrentUser user
   * @param totalAmount
   * @returns
   */
  public async initSurveyPayment(
    survey: Survey,
    user: User,
    totalAmount: number,
  ) {
    return new Promise<User>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.createPayment(
          user,
          totalAmount,
          PaymentType.SURVEY,
          queryRunner,
          survey,
        );
        await this.deductPaymentFromUserWallet(user, totalAmount, queryRunner);
        const admin = await this.userService.getByEmail(ADMIN_EMAIL);
        if (admin) {
          await this.surveyPaymentToAdminWallet(
            totalAmount,
            queryRunner,
            admin,
          );
        }
        await this.surveyUpdateAfterPayment(survey, queryRunner);
        const sots = await this.sotService.sotsBySurveyId(survey.uuid);
        await this.distributeProfit(
          sots,
          totalAmount,
          survey.uuid,
          queryRunner,
        );
        await queryRunner.commitTransaction();
        return;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(err);
      } finally {
        await queryRunner.release();
        resolve(user);
      }
    });
  }

  /**
   * Distribute Profit Among Sot's Owner
   * @param sots
   * @param totalAmount
   * @param queryRunner
   */
  public async distributeProfit(
    sots: ISot[],
    totalAmount: number,
    surveyId: string,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const profitPerAddress = Number(
          new bigDecimal(totalAmount)
            .divide(new bigDecimal(sots.length), 5)
            .getValue(),
        );
        const pendingprofit: PendingProfit[] = [];
        sots.map((sot) => {
          if (sot.sotOwner !== process.env.OWNER_PUBLIC_KEY) {
            pendingprofit.push(
              this.pendingProfitRepository.create({
                sotId: sot.sotId,
                ownerAddress: sot.sotOwner,
                surveyId: surveyId,
                amountInSom: Number(
                  new bigDecimal(profitPerAddress)
                    .divide(new bigDecimal(2), 5)
                    .getValue(),
                ),
              }),
            );
          }
        });
        await queryRunner.manager.save(pendingprofit);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Create Payment on survey
   *
   * @param  user
   * @param  totalPayment:number
   * @param type
   * @param queryRunner
   * @param survey
   * @param order
   * @returns void
   */
  public async createPayment(
    user: User,
    totalPayment: number,
    type: string,
    queryRunner: QueryRunner,
    survey?: Survey,
    order?: Order,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const payment = new Payment();
        payment.amount = totalPayment;
        payment.wallet = user.wallet;
        payment.type = type;
        payment.paymentStatus = PaymentStatus.COMPLETED;
        switch (type) {
          case PaymentType.PURCHASE:
            payment.orderId = order;
            break;
          case PaymentType.SURVEY:
            payment.surveyId = survey;
            break;
        }
        await queryRunner.manager.save(payment);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Dedicate Payment From User Wallet
   *
   * @param  user
   * @param  totalPayment:number
   * @param queryRunner
   * @returns void
   */
  public async deductPaymentFromUserWallet(
    user: User,
    totalPayment: number,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const userInfo = await this.userService.get(user.uuid);
        const balance = Number(
          new bigDecimal(userInfo.wallet.balance)
            .subtract(new bigDecimal(totalPayment))
            .getValue(),
        );
        const totalSent = Number(
          new bigDecimal(userInfo.wallet.totalSent)
            .add(new bigDecimal(totalPayment))
            .getValue(),
        );
        const wallet = userInfo.wallet;
        wallet.balance = balance;
        wallet.totalSent = totalSent;
        await queryRunner.manager.save(wallet);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Survey Payment to Admin Wallets
   *
   * @param  totalPayment:number
   * @param  queryRunner:QueryRunner
   * @param  totalPayment:number
   * @returns void
   */
  public async surveyPaymentToAdminWallet(
    totalPayment: number,
    queryRunner: QueryRunner,
    admin: User,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const adminInfo = await this.userService.get(admin.uuid);
        const adminWallet = adminInfo.wallet;
        const balance = Number(
          new bigDecimal(adminWallet.balance)
            .add(new bigDecimal(totalPayment))
            .getValue(),
        );
        const totalReceived = Number(
          new bigDecimal(adminWallet.totalReceived)
            .add(new bigDecimal(totalPayment))
            .getValue(),
        );
        adminWallet.balance = balance;
        adminWallet.totalReceived = totalReceived;
        await queryRunner.manager.save(adminWallet);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** update Survey status to enabled after payment
   *
   * @param  survey
   * @param  queryRunner:QueryRunner
   * @returns void
   */
  public async surveyUpdateAfterPayment(
    survey: Survey,
    queryRunner: QueryRunner,
  ) {
    try {
      survey.feePaid = true;
      survey.status = SurveyStatus.ENABLED;
      await queryRunner.manager.save(survey);
      return;
    } catch (error) {
      throw error;
    }
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Make Recharge Payment
  /*
  /********************************************************************************************************************/
  /** get Wan amount From Usd value
   *
   * @param  usdAmount
   * @returns amountInKrw
   */
  async getWanFromUsd(usdAmount: number) {
    try {
      const amountInKrw = Number(
        new bigDecimal(CurrencyConverterService.wanPrice)
          .multiply(new bigDecimal(usdAmount))
          .getValue(),
      );
      return amountInKrw;
    } catch (err) {
      throw new HttpException(
        {
          statusCode: ResponseCode.BAD_REQUEST,
          message: ResponseMessage.ERROR_CURRENCY_CONVERSION,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
  }

  /** Make Recharge User Wallet
   *
   * @param  payload:RechargePaymentDto
   * @returns
   */
  async makeRecharge(payload: RechargePaymentDto) {
    try {
      const user = await this.userService.get(payload.userId);
      if (!user) {
        throw new HttpException(
          {
            statusCode: ResponseCode.USER_DOES_NOT_EXIST,
            message: ResponseMessage.USER_DOES_NOT_EXISTS,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.initRechargePayment(user, payload);
    } catch (err) {
      throw err;
    }
  }

  /** Initialize Recharge Payment of user Wallet
   *
   * @param  user User
   * @param payload RechargePaymentDto
   * @returns
   */
  public async initRechargePayment(user: User, payload: RechargePaymentDto) {
    return new Promise<User>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.createPayment(
          user,
          payload.amountInUsd,
          PaymentType.RECHARGE,
          queryRunner,
        );
        await this.createRecharge(user, payload.amountInUsd, queryRunner);
        await this.updateUserWallet(payload.amountInUsd, user, queryRunner);
        const respectPoints = this.getRespectLevelPointsOfUser(
          this.convertUsdToSom(payload.amountInUsd),
        );
        user.respectLevelPoints += respectPoints;
        user.respectLevel = this.userService.getUserRespectLevel(user);
        await this.tossService.makePayment(
          payload.paymentKey,
          payload.orderId,
          payload.amount,
        );
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(err);
      } finally {
        await queryRunner.release();
        resolve(user);
      }
    });
  }

  /**  Get Respect Level Points From Recharged Som Amount
   *
   * @param  som:number
   * @returns points
   */
  private getRespectLevelPointsOfUser(som: number) {
    let points = 0;
    points = som / StreakSize.HUNDRED;
    const remainder = som % StreakSize.HUNDRED;
    if (remainder !== 0) {
      points = Math.floor(points);
    }
    return points;
  }

  /** Create Recharge to user wallet
   *
   * @param  user User
   * @param  amountInUsd number
   * @param queryRunner QueryRunner
   * @returns void
   */
  public async createRecharge(
    user: User,
    amountInUsd: number,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const recharge = new WalletRecharge();
        recharge.amountInUsd = amountInUsd;
        recharge.amountInSom = this.convertUsdToSom(amountInUsd);
        recharge.type = PaymentType.RECHARGE;
        recharge.wallet = user.wallet;
        await queryRunner.manager.save(recharge);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert Dollars amount to Som value
   *
   * @param amountUsd
   * @returns
   */
  private convertUsdToSom(amountUsd: number) {
    return Number(
      new bigDecimal(amountUsd)
        .divide(new bigDecimal(SomToDollarRate), 5)
        .getValue(),
    );
  }

  /**
   * Update User Wallet Balance
   *
   * @param amountUsd
   * @param user
   * @param queryRunner
   * @returns
   */
  async updateUserWallet(
    amountUsd: number,
    user: User,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const somToAddInWallet = this.convertUsdToSom(amountUsd);
        user.wallet.balance += somToAddInWallet;
        user.wallet.totalRecharged += somToAddInWallet;
        user.wallet.totalReceived += somToAddInWallet;
        await queryRunner.manager.save(user.wallet);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
