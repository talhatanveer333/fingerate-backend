import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, QueryRunner } from 'typeorm';
import { getManager, getConnection, Repository } from 'typeorm';
import { JOB, ResponseCode, ResponseMessage } from '../../utils/enum';
import { Survey } from './survey.entity';
import {
  RegisterSurveyDto,
  OptionsDto,
  SurveyParamDto,
  AddSurveyCommentDto,
  SurveyParticipantDto,
  SurveyCommentListDto,
  CommentParamsDto,
  SurveyOptionChartDto,
  SilverBellRequestDto,
} from './common/survey.dtos';
import { User } from '../user/user.entity';
import { UsersService } from '../user/user.service';
import bigDecimal from 'js-big-decimal';
import { SotService } from '../../modules/sot/sot.service';
import { SotIdDto } from './common/survey.dtos';
import dayjs from 'dayjs';
import {
  SERVEY_REQUEST_FEE,
  PERCENTAGE_OF_TOTAL_REWARD,
} from './common/survey.constants';
import { SurveyOption } from './surveyoptions.entity';
import { MediaService } from '../media/media.service';
import {
  CommentOrderBy,
  AgeGroupEnum,
  SurveyStatus,
  SurveyType,
} from './common/survey.enums';
import { VerifiedEmail } from '../verified-email/verifiedemail.entity';
import { Sot } from '../../modules/sot/sot.entity';
import { SotSurvey } from './sotsurvey.entity';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';
import { AGE_GROUP } from './common/survey.constants';
import { SurveyParticipant } from './surveyparticipant.entity';
import { SurveyComment } from './surveycomment.entity';
import { S3Service } from '../../utils/s3/s3.service';
import { SurveyCommentLike } from './surveycommentlike.entity';
import {
  IOptionResult,
  IRewardDistribution,
  IRewardPayload,
} from './common/survey.interface';
import { SilverBellRequest } from './silverbellrequest.entity';
import { Reward } from '../payment/reward.entity';
import { UserWallet } from '../user/userwallet.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../../utils/logger/logger.service';
import { RewardType } from '../payment/common/payment.enums';
import { EventService } from '../event/event.service';
import { EventType, StreakSize } from '../event/common/event.enums';
import { Admin } from '../admin/admin/admin.entity';
import { VerifiedEmailService } from '../verified-email/verifiedemail.service';
import { RespectLevelPolicyPoints } from '../../modules/user/common/user.enums';

@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    @InjectRepository(SurveyParticipant)
    private readonly surveyParticipantRepository: Repository<SurveyParticipant>,
    @InjectRepository(SurveyComment)
    private readonly surveyCommentRepository: Repository<SurveyComment>,
    @InjectRepository(SurveyCommentLike)
    private readonly surveyCommentLikeRepository: Repository<SurveyCommentLike>,
    @InjectRepository(SotSurvey)
    private readonly sotSurveyRepository: Repository<SotSurvey>,
    @InjectRepository(SilverBellRequest)
    private readonly silverBellRequestRepository: Repository<SilverBellRequest>,
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
    @InjectRepository(UserWallet)
    private readonly userWalletRepository: Repository<UserWallet>,
    @InjectRepository(SurveyOption)
    private readonly surveyOptionRepository: Repository<SurveyOption>,
    private readonly sotService: SotService,
    private readonly userService: UsersService,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
    private readonly eventService: EventService,
    private readonly loggerService: LoggerService,
    private readonly verifiedEmailService: VerifiedEmailService,
  ) { }

  /**
   * Register New Survey
   *
   * @param user
   * @param payload
   * @return 
   */
  async registerSurvey(payload: RegisterSurveyDto, user?: User, admin?: Admin) {
    try {
      switch (payload.type) {
        case SurveyType.SINGLE:
          if (payload.sots.length > 1) {
            throw new HttpException(
              {
                statusCode: ResponseCode.MUST_HAVE_ONE_SOT,
                message: ResponseMessage.MUST_HAVE_ONE_SOT,
              },
              ResponseCode.BAD_REQUEST,
            );
          }
          break;
        case SurveyType.MULTIPLE:
          if (payload.sots.length <= 1) {
            throw new HttpException(
              {
                statusCode: ResponseCode.MUST_HAVE_MULTIPLE_SOT,
                message: ResponseMessage.MUST_HAVE_MULTIPLE_SOT,
              },
              ResponseCode.BAD_REQUEST,
            );
          }
      }
      const sots = await this.sotService.validateSots(payload.sots);
      const verifiedEmail = await this.verifiedEmailService.findOne({
        email: payload.email,
        verified: true,
      });
      if (!verifiedEmail && !admin) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
            message: ResponseMessage.EMAIL_NOT_REGISTERED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const uniqueKeys = [
        ...new Set(
          payload.options.filter((option) => option.image).map((m) => m.image),
        ),
      ];
      const medias = await this.mediaService.getMediaByKeys(uniqueKeys);
      if (uniqueKeys.length !== medias.length) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_S3_KEY,
            message: ResponseMessage.INVALID_S3_KEY,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const survey = new Survey().fromDto(payload);
      survey.totalSots = sots.length;
      survey.email = payload?.email || user?.email || admin?.email;
      survey.initiator = user;
      const newSurvey = await this.initSurveyRegistration(
        survey,
        sots,
        payload.options,
      );
      return newSurvey.uuid;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Initiate survey registration transaction
   *
   * @param survey
   * @param sots[]
   * @param options[]
   * @returns
   */
  public async initSurveyRegistration(
    survey: Survey,
    sots: Sot[],
    options: OptionsDto[],
  ) {
    let registeredSurvey: Survey;
    return new Promise<Survey>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        registeredSurvey = await this.saveSurvey(survey, queryRunner);
        await this.saveSurveyOptions(registeredSurvey, options, queryRunner);
        await this.saveSurveySots(registeredSurvey, sots, queryRunner);
        const keys = options.map((i) => i.image);
        await this.mediaService.removeMedia(keys);
        if (survey.initiator) {
          survey.initiator.respectLevelPoints +=
            RespectLevelPolicyPoints.SURVEY_REQUEST;
          survey.initiator.respectLevel = this.userService.getUserRespectLevel(
            survey.initiator,
          );
          await queryRunner.manager.save(survey.initiator);
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(err);
      } finally {
        await queryRunner.release();
        resolve(registeredSurvey);
      }
    });
  }

  /**
   * Save the sots on which survey will run
   *
   * @param survey
   * @param sots[]
   * @param queryRunner
   * @returns
   */
  async saveSurveySots(survey: Survey, sots: Sot[], queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await Promise.all(
          sots.map(async (sot) => {
            const surveySot = new SotSurvey();
            surveySot.sot = sot;
            surveySot.survey = survey;
            await queryRunner.manager.save(surveySot);
          }),
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save new survey
   *
   * @param survey
   * @param queryRunner
   * @returns
   */
  async saveSurvey(survey: Survey, queryRunner: QueryRunner) {
    return new Promise<Survey>(async (resolve, reject) => {
      try {
        const newSurvey = await queryRunner.manager.save(survey);
        resolve(newSurvey);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save survey options
   *
   * @param survey
   * @param options[]
   * @param queryRunner
   * @returns
   */
  async saveSurveyOptions(
    survey: Survey,
    options: OptionsDto[],
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await Promise.all(
          options.map(async (option, k) => {
            const newOption = new SurveyOption().fromDto(option, survey);
            newOption.sequenceNumber = ++k;
            await queryRunner.manager.save(newOption);
          }),
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * get Survey detail By Id
   *
   * @param uuid
   * @returns
   */
  public async getSurveyById(uuid: string): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: {
        uuid,
      },
      relations: ['options', 'initiator', 'initiator.notificationSetting'],
    });
    if (!survey) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_ID,
          message: ResponseMessage.SURVEY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return survey;
  }

  /**
   * get Survey Option By surveyId
   *
   * @param surveyId
   * @param uuid
   * @returns surveyOption
   */
  public async getSurveyOptionById(
    surveyId: string,
    uuid: string,
  ): Promise<SurveyOption> {
    const surveyOption = await this.surveyOptionRepository.findOne({
      where: {
        uuid: uuid,
        survey: surveyId,
      },
    });
    if (!surveyOption) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_OPTION_ID,
          message: ResponseMessage.SURVEY_OPTION_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return surveyOption;
  }

  /**
   * get Survey detail by surveyId to owner/initiator only
   *
   * @param uuid
   * @param initiator
   * @returns survey
   */
  public async getSurveyByIdAndInitiator(
    uuid: string,
    initiator: string,
  ): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: {
        uuid,
        initiator,
      },
      relations: ['initiator'],
    });
    if (!survey) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_ID,
          message: ResponseMessage.SURVEY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return survey;
  }

  /**
   * get Survey Sots  by surveyId
   *
   * @param surveyId
   * @returns sotsSurveys
   */
  public async getSurveySotsById(surveyId: string): Promise<SotSurvey[]> {
    const sotsSurveys = await this.sotSurveyRepository.find({
      where: {
        survey: surveyId,
      },
      relations: ['sot'],
    });
    if (!sotsSurveys) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_ID,
          message: ResponseMessage.SURVEY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return sotsSurveys;
  }

  /**
   * Update survey status
   *
   * @param uuid
   * @param status
   * @returns
   */
  public async updateSurveyStatus(uuid: string, status: string): Promise<void> {
    await this.surveyRepository.update({ uuid, feePaid: true }, { status });
    return;
  }

  /**
   * Get Survey List By Sot Id with pagination
   *
   * @param params:SotIdDto
   * @param paginationOption:IPaginationOptions
   * @returns surveys,totalSurvey:
   */
  public async getSurveyslistBySotId(
    params: SotIdDto,
    paginationOption: IPaginationOptions,
  ) {
    const limit = Number(paginationOption.limit);
    const page = Number(paginationOption.page);
    const sql = `SELECT  
                      survey."uuid" as surveyId,
                      survey."rewardeesCount",
                      survey."rewardAmount",
                      survey."startingDate",
                      survey."endingDate",
                      survey."question",
                      survey."participantsCount" as allowedParticipants,
                      survey."type" ,
                      ( SELECT  CAST(COUNT(*) AS INTEGER) 
                        FROM
                          surveys_participants AS p
                        WHERE
                          p."surveyId"=survey."uuid"
                      ) as totalParticipations
                    FROM
                      surveys as survey
                      INNER JOIN sots_surveys as ss ON ss."surveyId" = survey."uuid"
                      INNER JOIN sots as s ON s."uuid" = ss."sotId"
                    WHERE 
                      s.uuid=$1 and survey."status"='${SurveyStatus.ONGOING}' LIMIT $2 OFFSET $3`;
    const surveys: Survey[] = await getManager().query(sql, [
      params.sotId,
      limit,
      limit * (page - 1),
    ]);
    const sql_total = `SELECT  
                        COUNT(*) as total_surveys
                      FROM
                        surveys as survey
                        INNER JOIN sots_surveys as ss ON ss."surveyId" = survey."uuid"
                        INNER JOIN sots as s ON s."uuid" = ss."sotId"
                      WHERE 
                        s.uuid=$1 and survey."status"='${SurveyStatus.ONGOING}'`;
    const totalSurveys = await getManager().query(sql_total, [params.sotId]);
    return {
      surveys,
      totalSurvey: Number(totalSurveys[0].total_surveys),
    };
  }

  /** get Survey payment Receipt to owner with payments details
   *
   * @param  surveyId
   * @currentUser  user
   * @returns  totalPaymentAmount,mySom, serveyRequestFee, serveyRequestFeePerDay, days, totalRewardAmount, rewardAmountPerDay,
    rewardDistributionFee,rewardDistributionFeePerday,
   */
  public async getSurveyReceipt(surveyId: string, user: User): Promise<any> {
    try {
      const survey = await this.getSurveyByIdAndInitiator(surveyId, user.uuid);
      let serveyRequestFeePerDay = SERVEY_REQUEST_FEE;
      if (survey.type === SurveyType.MULTIPLE) {
        const sotsSurveys = await this.getSurveySotsById(surveyId);
        serveyRequestFeePerDay = Number(
          new bigDecimal(SERVEY_REQUEST_FEE)
            .multiply(new bigDecimal(sotsSurveys.length))
            .getValue(),
        );
      }
      const userBalance = user.wallet.balance;
      const days =
        dayjs
          .unix(survey.endingDate)
          .endOf('day')
          .diff(dayjs.unix(survey.startingDate).startOf('day'), 'days') + 1;
      const mySom = userBalance;
      const {
        totalPaymentAmount,
        serveyRequestFee,
        totalRewardAmount,
        rewardDistributionFee,
      } = await this.getSurveyPayments(survey);
      const rewardAmountPerDay = Number(
        new bigDecimal(totalRewardAmount)
          .divide(new bigDecimal(days), 4)
          .getValue(),
      );

      const rewardDistributionFeePerday = Number(
        new bigDecimal(rewardDistributionFee)
          .divide(new bigDecimal(days), 4)
          .getValue(),
      );
      return {
        totalPaymentAmount,
        mySom,
        serveyRequestFee,
        serveyRequestFeePerDay,
        days,
        totalRewardAmount,
        rewardAmountPerDay,
        rewardDistributionFee,
        rewardDistributionFeePerday,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Survey Payment detail by Survey 
   *
   * @param survey
   * @return serveyRequestFee, totalRewardAmount, rewardDistributionFee, totalPaymentAmount,
   */
  async getSurveyPayments(survey: Survey) {
    const days =
      dayjs
        .unix(survey.endingDate)
        .endOf('day')
        .diff(dayjs.unix(survey.startingDate).startOf('day'), 'days') + 1;
    let serveyRequestFeePerDay = SERVEY_REQUEST_FEE;
    if (survey.type === SurveyType.MULTIPLE) {
      const sotsSurveys = await this.getSurveySotsById(survey.uuid);
      serveyRequestFeePerDay = Number(
        new bigDecimal(SERVEY_REQUEST_FEE)
          .multiply(new bigDecimal(sotsSurveys.length))
          .getValue(),
      );
    }
    const serveyRequestFee = Number(
      new bigDecimal(serveyRequestFeePerDay)
        .multiply(new bigDecimal(days))
        .getValue(),
    );
    const totalRewardAmount = Number(
      new bigDecimal(survey.rewardAmount)
        .multiply(new bigDecimal(survey.rewardeesCount))
        .getValue(),
    );
    const rewardDistributionFee = Number(
      new bigDecimal(PERCENTAGE_OF_TOTAL_REWARD)
        .divide(new bigDecimal(100), 4)
        .multiply(new bigDecimal(totalRewardAmount))
        .getValue(),
    );
    const totalPaymentAmount = Number(
      new bigDecimal(serveyRequestFee)
        .add(new bigDecimal(totalRewardAmount))
        .add(new bigDecimal(rewardDistributionFee))
        .getValue(),
    );
    return {
      serveyRequestFee,
      totalRewardAmount,
      rewardDistributionFee,
      totalPaymentAmount,
    };
  }

  /**
   * Get User Requested Survey List with pagination
   *
   * @param query
   * @param userId
   * @param paginationOption:IPaginationOptions
   * @returns surveys, total_surveys
   */
  public async getRequestedSurveyList(
    query: any,
    user: User,
    paginationOption: IPaginationOptions,
  ) {
    const limit = Number(paginationOption.limit);
    const page = Number(paginationOption.page);

    let filter = '';
    let sort = 'asc';
    if (query.status) {
      filter += ` AND s."status" = '${query.status}'`;
    }
    if (query.sort) {
      sort = query.sort;
    }

    const sql = `SELECT
          s."uuid",
          s."question",
          s."startingDate",
          s."endingDate",
          s."status",
          array_agg(concat(sot."city",' ',sot."country")) as "sots"
          FROM surveys s
          INNER JOIN sots_surveys as ss ON ss."surveyId" = s."uuid"
          INNER JOIN sots as sot ON sot."uuid" = ss."sotId"
          WHERE s."initiatorId"=$1 ${filter}
          GROUP BY s."uuid"
          ORDER BY s."createdAt" ${sort}
          LIMIT $2 OFFSET $3
          `;
    const total_sql = `SELECT
           COUNT(*)
           FROM surveys s
           WHERE s."initiatorId"=$1 ${filter}
    `;
    const surveys = await this.surveyRepository.query(sql, [
      user.uuid,
      limit,
      limit * (page - 1),
    ]);
    const total_result = await this.surveyRepository.query(total_sql, [
      user.uuid,
    ]);
    return { surveys, total_surveys: Number(total_result[0].count) };
  }

  /**
   * Get Survey Participant list 
   *
   *@param surveyId
   *@return surveyParticipant
   */
  async getSurveyParticipants(surveyId: string): Promise<SurveyParticipant[]> {
    const surveyParticipant = await this.surveyParticipantRepository.find({
      where: { surveyId },
      relations: [
        'userId',
        'userId.wallet',
        'userId.sessionInfo',
        'userId.notificationSetting',
      ],
    });
    return surveyParticipant;
  }

  /**
   * Check User have participate in Survey 
   *
   *@param surveyId
   * @param userId
   * @return surveyParticipant
   */
  async checkUserSurveyParticipation(
    surveyId: string,
    userId: string,
  ): Promise<SurveyParticipant> {
    const surveyParticipant = await this.surveyParticipantRepository.findOne({
      where: { surveyId, userId },
      relations: ['userId', 'OptionId'],
    });
    return surveyParticipant;
  }

  /**
   * Add Silver Bell Survey Request
   *
   * @param payload
   * @returns
   */
  async addSilverBellRequest(
    payload: SilverBellRequestDto,
  ): Promise<SilverBellRequest> {
    try {
      const silverBellRequest = new SilverBellRequest().fromDto(payload);
      return await this.silverBellRequestRepository.save(silverBellRequest);
    } catch (error) {
      throw error;
    }
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Survey Participation
  /*
  /********************************************************************************************************************/
  /**
   * Submit Survey Participation by surveyId
   *
   *@param surveyId
   *@currentUser
   *@body payload:SurveyParticipantDto
   */
  async submitSurveyParticipation(
    surveyParam: SurveyParamDto,
    user: User,
    payload: SurveyParticipantDto,
  ) {
    try {
      const survey = await this.getSurveyById(surveyParam.surveyId);
      if (survey.initiator.uuid === user.uuid) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INITIATOR_CAN_NOT_PARTICIPATE,
            message: ResponseMessage.INITIATOR_CAN_NOT_PARTICIPATE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (survey.status !== SurveyStatus.ONGOING) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_SURVEY_ID,
            message: ResponseMessage.SURVEY_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const optionExist = survey.options.findIndex(
        (o) => o.uuid === payload.optionId,
      );
      if (optionExist === -1) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_OPTION_ID,
            message: ResponseMessage.INVALID_OPTION_ID,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const surveyParticipants = await this.getSurveyParticipants(survey.uuid);
      const totalSurveyParticipant = surveyParticipants.length;
      if (
        survey.limitedParticipants &&
        totalSurveyParticipant >= survey.participantsCount
      ) {
        throw new HttpException(
          {
            statusCode: ResponseCode.PARTICIPATED_COUNT_COMPLETED,
            message: ResponseMessage.PARTICIPATED_COUNT_COMPLETED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const checkUserparticipation = surveyParticipants.findIndex(
        (c) => c.userId.uuid === user.uuid,
      );
      if (checkUserparticipation > -1) {
        throw new HttpException(
          {
            statusCode: ResponseCode.PARTICIPATED_IN_SURVEY,
            message: ResponseMessage.PARTICIPATED_IN_SURVEY,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const newsurveyParticipant = new SurveyParticipant();
      newsurveyParticipant.surveyId = survey;
      newsurveyParticipant.userId = user;
      newsurveyParticipant.OptionId = survey.options[optionExist];
      await this.surveyParticipantRepository.save(newsurveyParticipant);
      const isParticipated = await this.eventService.checkAlreadyMarked(
        user,
        EventType.PARTICIPATION,
        false,
      );
      if (!isParticipated) {
        await this.eventService.initAttendance(user, EventType.PARTICIPATION);
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  /**  Get Survey Detail by surveyId 
   *
   * @param surveyId
   * @param userId
   * @body payload:SurveyParticipantDto
   * @return survey
   */
  public async getSurveyDetail(
    surveyId: string,
    userId: string,
  ): Promise<Survey> {
    const sql = `SELECT 
    s."uuid" as "surveyId",
    s."question",
    s."startingDate",
    s."endingDate",
    s."participantsCount",
    s."rewardAmount",
    s."rewardeesCount",
    s."previewComments",
    s."type",
    s."status",
    CAST((SELECT COUNT(*) FROM surveys_participants sp WHERE sp."surveyId"=s."uuid") AS INT) AS "participationCount",
    json_agg(json_build_object('id',so."uuid",'name',so."name",'description',so."description",'image',so."image",'sequenceNumber',so."sequenceNumber"))  "options",
    (SELECT 
    array_agg(concat(sot."city",' ',sot."country")) AS "sots"
    FROM sots_surveys ss 
    INNER JOIN sots AS sot ON sot."uuid" = ss."sotId"
    WHERE ss."surveyId"=s."uuid"
    ) AS sots
    FROM surveys s 
    INNER JOIN survey_options so ON so."surveyId"=s."uuid"
    WHERE s."uuid"=$1
    GROUP By s."uuid"`;

    const survey = await this.surveyRepository.query(sql, [surveyId]);
    if (!survey.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_ID,
          message: ResponseMessage.SURVEY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    let participated = false;
    let optionId = null;
    const participation = await this.checkUserSurveyParticipation(
      surveyId,
      userId,
    );
    if (participation) {
      participated = true;
      optionId = participation.OptionId.uuid;
    }
    survey[0].options.map((i) => {
      i.image = i.image ? this.s3Service.getSignedURL(i.image) : null;
    });
    survey[0].participated = participated;
    survey[0].participationOption = optionId;
    return survey[0];
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Survey Comment
  /*
  /********************************************************************************************************************/
  /**
   * Get Survey Options By surveyId
   *
   * @param surveyId
   * @returns
   */

  public async optionsBySurveyId(surveyId: string) {
    const sql = `SELECT 
      so."uuid",
      so."name",
      so."description",
      so."colour",
      so."sequenceNumber"
    FROM 
      survey_options so  
    WHERE so."surveyId"=$1`;

    const survey = await this.surveyRepository.query(sql, [surveyId]);
    return survey;
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Add Survey Comment
  /*
  /********************************************************************************************************************/
  /**
   * Add Comment on survey  
   *
   * @param surveyParam
   * @currentUser user
   * @body payload:AddSurveyCommentDto
   */
  async addSurveyComment(
    surveyParam: SurveyParamDto,
    user: User,
    payload: AddSurveyCommentDto,
  ) {
    try {
      const survey = await this.getSurveyById(surveyParam.surveyId);
      if (survey.status !== SurveyStatus.ONGOING) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_SURVEY_ID,
            message: ResponseMessage.SURVEY_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const userSurveyParticipantion =
        await this.surveyParticipantRepository.findOne({
          where: { surveyId: surveyParam.surveyId, userId: user.uuid },
          relations: ['userId', 'surveyId', 'surveyComment'],
        });
      if (!userSurveyParticipantion) {
        throw new HttpException(
          {
            statusCode: ResponseCode.NOT_PARTICIPATED,
            message: ResponseMessage.NOT_PARTICIPATED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (userSurveyParticipantion.surveyComment) {
        throw new HttpException(
          {
            statusCode: ResponseCode.COMMENT_ALREADY_ADDED,
            message: ResponseMessage.COMMENT_ALREADY_ADDED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const newSurveyComment = new SurveyComment();
      newSurveyComment.body = payload.body;
      const surveyComment = await this.surveyCommentRepository.save(
        newSurveyComment,
      );
      userSurveyParticipantion.surveyComment = surveyComment;
      await this.surveyParticipantRepository.save(userSurveyParticipantion);
      userSurveyParticipantion.userId.respectLevelPoints +=
        RespectLevelPolicyPoints.PER_COMMENT;
      userSurveyParticipantion.userId.respectLevel =
        this.userService.getUserRespectLevel(userSurveyParticipantion.userId);
      await this.userService.save(userSurveyParticipantion.userId);
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Survey Comment list By surveyId with pagination
   *
   * @param surveyId: string,
   * @param query: SurveyCommentListDto,
   * @param user: User,
   * @param pagination: IPaginationOptions,
   * @returns    comments, previewComments,total_comments
   */
  public async commentsBySurveyId(
    surveyId: string,
    query: SurveyCommentListDto,
    user: User,
    pagination: IPaginationOptions,
  ) {
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);

    const survey = await this.getSurveyById(surveyId)
    let orderBy = 'ORDER BY sc."createdAt" asc';
    let filter = '';
    if (query.optionId) {
      filter += `AND sp."OptionId" = '${query.optionId}'`;
    }
    if (query.orderBy) {
      orderBy =
        query.orderBy === CommentOrderBy.LIKES
          ? 'ORDER BY sc."likes" desc'
          : `ORDER BY sc."createdAt" ${query.orderBy}`;
    }
    if (!survey?.previewComments && survey.initiator.uuid !== user.uuid) {
      filter = '';
      orderBy = '';
      filter += `AND  sp."userId" = '${user.uuid}'`;
    }

    const sql = `SELECT sc."uuid",
        sc."createdAt",
        sc."likes",
        sc."body",
        so."name" as "optionName",
        so."colour" as "optionColour",
        u."nickName",
        u."profileImage",
        ua."avatar",
        CASE WHEN (SELECT COUNT(*) FROM surveys_comments_likes scl WHERE scl."commentId" = sc."uuid" AND scl."userId" = '${user.uuid}') = 1 THEN true else false END "isLiked",
        CASE WHEN (sp."userId"='${user.uuid}') THEN true else false END "canDelete"
        FROM surveys_participants sp 
        INNER JOIN survey_comments sc ON sc."uuid" = sp."commentId"
        INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
        INNER JOIN users u ON u."uuid" = sp."userId"
        INNER JOIN user_avatars ua ON ua."uuid" = u."avatarId"
        WHERE sp."surveyId" = $1 ${filter}
        ${orderBy}
        LIMIT $2 OFFSET $3
        `;
    const total_sql = `SELECT COUNT(*)
        FROM surveys_participants sp 
        INNER JOIN survey_comments sc ON sc."uuid" = sp."commentId"
        INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
        INNER JOIN users u ON u."uuid" = sp."userId"
        INNER JOIN user_avatars ua ON ua."uuid" = u."avatarId"
        WHERE sp."surveyId" = $1 ${filter}
        `;
    const total_result = await this.surveyRepository.query(total_sql, [
      surveyId,
    ]);
    const comments = await this.surveyRepository.query(sql, [
      surveyId,
      limit,
      limit * (page - 1),
    ]);

    return {
      comments,
      previewComments: survey?.previewComments,
      total_comments: Number(total_result[0].count),
    };
  }

  /**
   * Toggle Survey Comment like and unlike
   *
   *@param commentParam
   *@currentUser user
   */
  async toggleLikeSurveyComment(commentParam: CommentParamsDto, user: User) {
    try {
      const surveyComment = await this.surveyCommentRepository.findOne({
        where: { uuid: commentParam.commentId },
        relations: ['commentLikes', 'commentLikes.userId'],
      });
      if (!surveyComment) {
        throw new HttpException(
          {
            statusCode: ResponseCode.COMMENT_NOT_EXIST,
            message: ResponseMessage.COMMENT_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const checkUserSurveyCommentLikes = surveyComment.commentLikes.findIndex(
        (o) => o.userId.uuid === user.uuid,
      );
      if (checkUserSurveyCommentLikes > -1) {
        await this.surveyCommentRepository.update(
          { uuid: surveyComment.uuid },
          { likes: surveyComment.likes - 1 },
        );
        await this.surveyCommentLikeRepository.delete({
          uuid: surveyComment.commentLikes[checkUserSurveyCommentLikes].uuid,
        });
      } else {
        surveyComment.likesHistory += 1;
        surveyComment.likes += 1;
        const respectPoints = this.getRespectLevelPointsOfUser(surveyComment.likesHistory);
        const { userId } = await this.surveyParticipantRepository.findOne({
          comment: surveyComment.uuid,
          relations: ['userId']
        });
        userId.respectLevelPoints += respectPoints;
        userId.respectLevel = this.userService.getUserRespectLevel(userId);
        await this.userService.save(userId);
        await this.surveyCommentRepository.save(surveyComment);
        await this.createSurveyCommentLike(surveyComment, user);
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Respect Level Points From Number Of Likes
   * 
   * @param likes
   * @return points
   */
  private getRespectLevelPointsOfUser(likes: number) {
    let points = 0;
    const remainder = likes % StreakSize.TEN;
    if (remainder === 0) {
      points += RespectLevelPolicyPoints.TEN_COMMENT_LIKES;
    }
    return points;
  }

  /**
   * Create New Like on Comment by commentId
   * @param surveyComment 
   * @param user 
   * @returns 
   */
  async createSurveyCommentLike(surveyComment: SurveyComment, user: User) {
    const newsurveyCommentLike = new SurveyCommentLike();
    newsurveyCommentLike.commentId = surveyComment;
    newsurveyCommentLike.userId = user;
    return await this.surveyCommentLikeRepository.save(newsurveyCommentLike);
  }

  /**
   * delete Survey Comment by commentId
   *
   * @param commentParam
   * @currentUser user
   */
  async deleteSurveyComment(commentParam: CommentParamsDto, user: User) {
    try {
      const surveyComment = await this.surveyParticipantRepository.findOne({
        where: { surveyComment: commentParam.commentId },
        relations: ['surveyComment', 'userId', 'surveyId'],
      });
      if (!surveyComment) {
        throw new HttpException(
          {
            statusCode: ResponseCode.COMMENT_NOT_EXIST,
            message: ResponseMessage.COMMENT_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (surveyComment.userId.uuid !== user.uuid) {
        throw new HttpException(
          {
            statusCode: ResponseCode.ONLY_COMMENT_INITIATOR_CAN_DELETE,
            message: ResponseMessage.ONLY_COMMENT_INITIATOR_CAN_DELETE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      surveyComment.surveyComment = null;
      await this.surveyParticipantRepository.save(surveyComment);
      await this.surveyCommentRepository.delete({
        uuid: commentParam.commentId,
      });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Survey Participation List
  /*
  /********************************************************************************************************************/

  /**
   * Get Survey Participation List with Pagination
   *
   * @param query
   * @param user
   * @param paginationOption: IPaginationOptions
   * @returns surveys, total_surveys
   */
  public async getSurveyParticipationList(
    query: any,
    user: User,
    paginationOption: IPaginationOptions,
  ) {
    const limit = Number(paginationOption.limit);
    const page = Number(paginationOption.page);
    let filter = '';
    let sort = 'asc';
    if (query.status) {
      filter += ` AND s."status" = '${query.status}'`;
    }
    if (query.sort) {
      sort = query.sort;
    }
    const sql = `SELECT
          s."uuid",
          s."question",
          s."startingDate",
          s."endingDate",
          s."status",
          array_agg(concat(sot."city",' ',sot."country")) as "sots"
        FROM surveys s
          INNER JOIN sots_surveys as ss ON ss."surveyId" = s."uuid"
          INNER JOIN sots as sot ON sot."uuid" = ss."sotId"
          INNER JOIN surveys_participants as sp ON sp."surveyId" = s."uuid"
        WHERE sp."userId"=$1 ${filter}
        GROUP BY s."uuid"
        ORDER BY s."createdAt" ${sort}
        LIMIT $2 OFFSET $3
          `;
    const total_sql = `SELECT
           COUNT(*)
          FROM 
            surveys s
            INNER JOIN surveys_participants as sp ON sp."surveyId" = s."uuid"
          WHERE sp."userId"=$1 ${filter}
    `;
    const surveys = await this.surveyRepository.query(sql, [
      user.uuid,
      limit,
      limit * (page - 1),
    ]);
    const total_result = await this.surveyRepository.query(total_sql, [
      user.uuid,
    ]);
    return { surveys, total_surveys: Number(total_result[0].count) };
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   SURVEY CHART
  /*
  /********************************************************************************************************************/
  /**
   * Get Gender Chart By SurveyId
   *
   * @param surveyId 
   * @returns data
   */
  public async genderChartBySurveyId(surveyId: string) {
    const sql = `SELECT 
    so."uuid",
    so."name",
    so."colour",
    so."sequenceNumber",
    CAST(COUNT(CASE WHEN u."gender" IS NOT NULL THEN 1 END) AS INT) AS "totalCount",
    CAST((SUM(CASE WHEN u."gender" = 'male' THEN 1 ELSE 0 END)) AS INT) AS "maleCount",
    CAST((SUM(CASE WHEN u."gender" = 'female' THEN 1 ELSE 0 END)) AS INT) AS "femaleCount"
    FROM surveys_participants sp
    INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
    INNER JOIN users u ON  u."uuid" = sp."userId"
    WHERE sp."surveyId" = $1
    GROUP BY so."uuid"
      `;
    const options = await this.optionsBySurveyId(surveyId);
    const data = await this.surveyRepository.query(sql, [surveyId]);
    options.map((option) => {
      const index = data.findIndex((x) => x.uuid === option.uuid);
      if (index >= 0) {
        const optionObj = data[index];
        optionObj.femalePercentage =
          optionObj.totalCount === 0
            ? 0
            : Number(
              new bigDecimal(optionObj.femaleCount)
                .divide(new bigDecimal(optionObj.totalCount), 4)
                .multiply(new bigDecimal(100))
                .getValue(),
            );
        optionObj.malePercentage =
          optionObj.totalCount === 0
            ? 0
            : Number(
              new bigDecimal(optionObj.maleCount)
                .divide(new bigDecimal(optionObj.totalCount), 4)
                .multiply(new bigDecimal(100))
                .getValue(),
            );
      } else {
        data.push({
          uuid: option.uuid,
          name: option.name,
          colour: option.colour,
          sequenceNumber: option.sequenceNumber,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          femalePercentage: 0,
          malePercentage: 0,
        });
      }
    });

    return data;
  }

  /**
   * get total participation chart by SurveyId
   *
   * @param SurveyId
   * @param user
   * @returns data
   */
  public async totalParticipationChartBySurveyId(
    surveyParamDto: SurveyParamDto,
  ) {
    try {
      const sql = `SELECT 
      so."uuid" as "OptionId",
      so."name" as "OptionName",
      so."colour" as "OptionColour",
      so."sequenceNumber" as "sequenceNumber",
      CAST(count(sp."OptionId") AS INTEGER) as "OptionCount"
      FROM surveys_participants sp
      INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
      RIGHT JOIN surveys s ON s."uuid" = so."surveyId"
      WHERE s."uuid" = $1
      GROUP BY so."uuid"
        `;
      const optionResult: IOptionResult[] = await this.surveyRepository.query(
        sql,
        [surveyParamDto.surveyId],
      );
      if (!optionResult.length) {
        return [];
      }
      const totalCount = optionResult
        .map((val) => val.OptionCount)
        .reduce((curr, acc) => {
          return curr + acc;
        });
      const optionPercentage = [];
      const options = await this.optionsBySurveyId(surveyParamDto.surveyId);
      options.map(async (current) => {
        const index = optionResult.findIndex(
          (x) => x.OptionId === current.uuid,
        );
        if (index >= 0) {
          optionPercentage.push({
            optionId: optionResult[index].OptionId,
            optionName: optionResult[index].OptionName,
            optionColour: optionResult[index].OptionColour,
            optionSequenceNumber: optionResult[index].sequenceNumber,
            percentage: Number(
              new bigDecimal(optionResult[index].OptionCount)
                .divide(new bigDecimal(totalCount), 4)
                .multiply(new bigDecimal(100))
                .getValue(),
            ),
          });
        } else {
          optionPercentage.push({
            optionId: current.uuid,
            optionName: current.name,
            optionColour: current.colour,
            optionSequenceNumber: current.sequenceNumber,
            percentage: 0,
          });
        }
      });
      return { totalCount, optionPercentage };
    } catch (error) {
      throw error;
    }
  }

  /** 
   * Get Age Chart By Survey Id
   * 
   * @param surveyId
   * @returns ageArray
    */
  public async ageChartBySurveyId(surveyId: string) {
    const sql = `SELECT
     so."uuid",
     so."name",
     so."colour",
     so."sequenceNumber",
     CAST((SUM(CASE WHEN (date_part('year', now()) - u."age" BETWEEN 10 AND 19)  THEN 1 ELSE 0 END)) AS INT) AS "tenCount",
     CAST((SUM(CASE WHEN ( date_part('year', now()) - u."age" BETWEEN 20 AND 29 ) THEN 1 ELSE 0 END)) AS INT) AS "twentyCount",
     CAST((SUM(CASE WHEN (date_part('year', now()) - u."age" BETWEEN 30  AND 39 )  THEN 1 ELSE 0 END)) AS INT) AS "thirtyCount",
     CAST((SUM(CASE WHEN (date_part('year', now()) - u."age" BETWEEN 40  AND 49) THEN 1 ELSE 0 END)) AS INT) AS "fourtyCount",
     CAST((SUM(CASE WHEN (date_part('year', now()) - u."age" BETWEEN 50 AND 59)  THEN 1 ELSE 0 END)) AS INT) AS "fiftyCount",
     CAST((SUM(CASE WHEN (date_part('year', now()) -  u."age" >= 60) THEN 1 ELSE 0 END)) AS INT) AS "sixtyCount"
     FROM surveys_participants sp
     INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
     INNER JOIN users u ON  u."uuid" = sp."userId"
     WHERE sp."surveyId" = $1
     GROUP BY so."uuid"
      `;
    let data = await this.surveyRepository.query(sql, [surveyId]);
    // Add Missing Options
    data = await this.addMissingOptions(data, surveyId);
    if (!data.length) {
      return [];
    }
    // Calculate the total Sum of different age's
    const total = await this.calculateSum(data);
    // Calculate the total Percentage Of Options By Age Group
    const ageArray = await this.calculateOptionsPercantage(data, total);
    return ageArray;
  }

  /**
   * Calculate Options Percentage By Age Group
   *
   * @param data
   * @param total
   * @returns ageArray
   */
  private async calculateOptionsPercantage(data, total) {
    const ageArray = [
      { age: AgeGroupEnum.TEN, options: [] },
      { age: AgeGroupEnum.TWENTY, options: [] },
      { age: AgeGroupEnum.THIRTY, options: [] },
      { age: AgeGroupEnum.FOURTY, options: [] },
      { age: AgeGroupEnum.FIFTY, options: [] },
      { age: AgeGroupEnum.SIXTY, options: [] },
    ];
    data.map((option) => {
      for (let i = 0; i < ageArray.length; i++) {
        switch (ageArray[i].age) {
          case AgeGroupEnum.TEN:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfTen === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.tenCount)
                      .divide(new bigDecimal(total.sumOfTen), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
          case AgeGroupEnum.TWENTY:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfTwenty === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.twentyCount)
                      .divide(new bigDecimal(total.sumOfTwenty), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
          case AgeGroupEnum.THIRTY:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfThirty === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.thirtyCount)
                      .divide(new bigDecimal(total.sumOfThirty), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
          case AgeGroupEnum.FOURTY:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfFourty === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.fourtyCount)
                      .divide(new bigDecimal(total.sumOfFourty), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
          case AgeGroupEnum.FIFTY:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfFifty === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.fiftyCount)
                      .divide(new bigDecimal(total.sumOfFifty), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
          default:
            ageArray[i].options.push({
              optionId: option.uuid,
              optionName: option.name,
              optionColour: option.colour,
              optionSequenceNumber: option.sequenceNumber,
              optionPercentage:
                total.sumOfSixty === 0
                  ? 0
                  : Number(
                    new bigDecimal(option.sixtyCount)
                      .divide(new bigDecimal(total.sumOfSixty), 4)
                      .multiply(new bigDecimal(100))
                      .getValue(),
                  ),
            });
            break;
        }
      }
    });
    return ageArray;
  }

  /**
   * Calculate Total Sum
   *
   * @param arr
   * @returns total
   */
  private async calculateSum(arr) {
    const total = arr.reduce(
      (acc, curr) => {
        return {
          sumOfTen: acc.sumOfTen + curr.tenCount,
          sumOfTwenty: acc.sumOfTwenty + curr.twentyCount,
          sumOfThirty: acc.sumOfThirty + curr.thirtyCount,
          sumOfFourty: acc.sumOfFourty + curr.fourtyCount,
          sumOfFifty: acc.sumOfFifty + curr.fiftyCount,
          sumOfSixty: acc.sumOfSixty + curr.sixtyCount,
        };
      },
      {
        sumOfTen: 0,
        sumOfTwenty: 0,
        sumOfThirty: 0,
        sumOfFourty: 0,
        sumOfFifty: 0,
        sumOfSixty: 0,
      },
    );
    return total;
  }

  /**
   * Add Options to list which are not in DB 
   *
   * @param data
   * @param surveyId
   * @returns data
   */
  private async addMissingOptions(data, surveyId) {
    const options = await this.optionsBySurveyId(surveyId);
    options.map((option) => {
      const index = data.findIndex((x) => x.uuid === option.uuid);
      if (index < 0) {
        data.push({
          uuid: option.uuid,
          name: option.name,
          colour: option.colour,
          sequenceNumber: option.sequenceNumber,
          totalCount: 0,
          tenCount: 0,
          twentyCount: 0,
          thirtyCount: 0,
          fourtyCount: 0,
          fiftyCount: 0,
          sixtyCount: 0,
        });
      }
    });

    return data;
  }

  /** Get option Chart By SurveyId
   *
   * @param query
   * @returns optionPercentage
   */
  public async optionChartBySurveyId(query: SurveyOptionChartDto) {
    const sql = `(	(SELECT 
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 0 AND 19   then 1 else 0 end) as "Teenager",
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 20 AND 29  then 1 else 0 end) as "Twenty",
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 30 AND 39  then 1 else 0 end) as "Thirty",
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 40 AND 49  then 1 else 0 end) as "Fourty",
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 50 AND  59 then 1 else 0 end) as "Fifty",
      sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) >= 60  then 1 else 0 end) as "SixtyPlus"
        FROM surveys_participants sp
          INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
          INNER JOIN users u ON  u."uuid" = sp."userId"
        WHERE 
       sp."surveyId" = $1
       AND sp."OptionId" = $2 AND u.gender = 'male')
   )	
  Union ALL	
    (SELECT 
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 0 AND 19   then 1 else 0 end) as "Teenager",
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 20 AND 29  then 1 else 0 end) as "Twenty",
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 30 AND 39  then 1 else 0 end) as "Thirty",
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 40 AND 49  then 1 else 0 end) as "Fourty",
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) Between 50 AND  59 then 1 else 0 end) as "Fifty",
        sum(case when  CAST ( date_part('year', now()) - u."age"  as INTEGER ) >= 60 then 1 else 0 end) as "SixtyPlus"
       FROM surveys_participants sp
         INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
         INNER JOIN users u ON  u."uuid" = sp."userId"
       WHERE 
      sp."surveyId" = $1 
      AND sp."OptionId" = $2 AND u.gender = 'female')`;

    const optionResult = await this.surveyRepository.query(sql, [
      query.surveyId,
      query.optionId,
    ]);
    const OptionCount = AGE_GROUP.map((current) => {
      return this.count(optionResult, current);
    });
    const optionPercentage = [];
    optionResult.map(async (current, key) => {
      const obj = {};
      const objGender = {};
      let gender = 'male';
      if (key === 1) {
        gender = 'female';
      }
      AGE_GROUP.forEach((value, index) => {
        obj[`${value}Percentage`] =
          OptionCount[index] > 0
            ? Number(
              new bigDecimal(current[value])
                .divide(new bigDecimal(OptionCount[index]), 4)
                .multiply(new bigDecimal(100))
                .getValue(),
            )
            : 0;
      });
      objGender[gender] = obj;
      optionPercentage.push(objGender);
    });
    return optionPercentage;
  }

  /**
   * Distribute reward to survey participate user on survey
   *
   * @param surveyId
   * @param queryRunner: QueryRunner
   * @returns
   */
  public async rewardDistribution(surveyId: string, queryRunner: QueryRunner) {
    return new Promise<IRewardDistribution>(async (resolve, reject) => {
      try {
        const survey: Survey = await this.getSurveyById(surveyId);
        const participants: SurveyParticipant[] =
          await this.getSurveyParticipants(surveyId);
        const randomParticipants = new Set();
        let users: User[] = [];
        if (participants.length >= survey.rewardeesCount) {
          while (randomParticipants.size != survey.rewardeesCount) {
            const randomNumber = Math.floor(
              Math.random() * participants.length,
            );
            const user = participants[randomNumber];
            randomParticipants.add(user.userId);
          }
          users = [...randomParticipants] as User[];
        } else {
          users = participants.map((i) => i.userId);
        }
        await this.addRewardInWallet(users, survey, queryRunner);
        resolve({ users, survey });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add Reward Amount In Users Wallets
   *
   * @param users[]
   * @param survey
   * @param queryRunner: QueryRunner
   */
  public async addRewardInWallet(
    users: User[],
    survey: Survey,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await Promise.all(
          users.map(async (user) => {
            await this.updateUserWallet(
              user.wallet,
              survey.rewardAmount,
              queryRunner,
            );
            const rewardPayload: IRewardPayload = {
              amount: survey.rewardAmount,
              survey: survey.question,
              wallet: user.wallet,
              type: RewardType.SURVEY_PARTICIPATION,
            };
            const reward: Reward = new Reward().fromDto(rewardPayload);
            await queryRunner.manager.save(reward);
          }),
        );

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update User Wallet 
   *
   * @param userWallet
   * @param rewardAmount
   * @param queryRunner: QueryRunner
   */
  private async updateUserWallet(
    userWallet: UserWallet,
    rewardAmount: number,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        userWallet.balance = Number(
          new bigDecimal(userWallet.balance)
            .add(new bigDecimal(rewardAmount))
            .getValue(),
        );
        userWallet.totalReceived = Number(
          new bigDecimal(userWallet.totalReceived)
            .add(new bigDecimal(rewardAmount))
            .getValue(),
        );
        await queryRunner.manager.save(userWallet);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sum value in array
   * @param array
   * @param key
   * @returns
   */
  count(array, key) {
    return array.reduce(function (r, a) {
      if (a[key] !== null) {
        return r + parseInt(a[key]);
      } else {
        return r;
      }
    }, 0);
  }

  /**
   * Reward Expiry Cron Job
   * Run After Every Five Minute
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async rewardExpiryJob() {
    this.loggerService.log(`Reward Expiry Job Started At ${dayjs().unix()}`);
    const now = dayjs().unix();
    const expiryRewards = await this.rewardRepository.find({
      where: {
        expiredAt: LessThan(now),
      },
      relations: ['wallet'],
    });
    expiryRewards.map(async (reward) => {
      const walletBalance = Number(
        new bigDecimal(reward.wallet.balance)
          .subtract(new bigDecimal(reward.amount))
          .getValue(),
      );
      const totalSomExpired = Number(
        new bigDecimal(reward.wallet.totalSomExpired)
          .add(new bigDecimal(reward.amount))
          .getValue(),
      );
      await this.userWalletRepository.update(reward.wallet.uuid, {
        balance: walletBalance,
        totalSomExpired,
      });
    });
    this.loggerService.log(`Reward Expiry Job Ended At ${dayjs().unix()}`);
  }
}
