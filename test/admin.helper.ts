import { INestApplication } from '@nestjs/common';
import { getConnection } from 'typeorm';
import { Admin, AdminService } from '../src/modules/admin/admin';
import request from 'supertest';
import { Helper } from './abstaract.helper';
import { AppHelper } from './app.helper';
import { ResponseMessage } from '../src/utils/enum';
import { AccountStatus } from '../src/modules/admin/admin/commons/admin.enum';
import { Hash } from '../src/utils/Hash';
import { User } from '../src/modules/user';
import { AuthService } from '../src/modules/admin/auth';
import { generateToken } from 'authenticator';
import { Inquiry } from '../src/modules/customerservice/inquiry.entity';
import { Payment } from '../src/modules/payment/payment.entity';
import { PaymentStatus, PaymentType, RewardType, TransactionType, TransactionType as RerwardTransactionType } from '../src/modules/payment/common/payment.enums';
import { Reward } from '../src/modules/payment/reward.entity';
import { SilverBellRequest } from '../src/modules/survey/silverbellrequest.entity';
import { SilverBellRequestStatus } from '../src/modules/survey/common/survey.enums';
import { InfoReward } from '../src/modules/user/common/user.enums';
import { WalletRecharge } from '../src/modules/payment/walletrecharge.entity';
import { UserItemCollection } from '../src/modules/user/useritemcollection.entity';
import { UserItemWishlist } from '../src/modules/itemwishlist/itemwishlist.entity';

export class AdminHelper extends Helper {
  private appHelper: AppHelper;
  private testUserDto = {
    email: 'test_fingerate_admin_helper@yopmail.com',
    password: 'Test@1234',
    passwordConfirmation: 'Test@1234',
    code: '1234'
  };

  constructor(app: INestApplication) {
    super(app);
    this.appHelper = new AppHelper(app);
  }

  public async init() {
    const adminRepository = getConnection().getRepository(Admin);
    const adminExists = await adminRepository.findOne({
      email: this.testUserDto.email,
    });
    if (!adminExists) {
      const admin = await this.creatAdmin(this.testUserDto.email);
      await this.setPassword(admin, this.testUserDto.password);
    }
    const twoFAToken = await this.login(this.testUserDto.email, this.testUserDto.password);
    await this.verify2fa(twoFAToken, this.testUserDto.code);
    return;
  }

  public async createReward() {
    const admin = await this.creatAdmin('admin@fingerate.com');
    const user = await this.createUser('user@fingerate.com');
    const repository = getConnection().getRepository(Reward);
    const reward = {
      type: RewardType.ATTENDANCE,
      amount: 6500,
      expiredAt: 1697761083,
      transactionType: RerwardTransactionType.INBOUND,
      wallet: user.wallet,
      admin: admin,
      reason: "I am the reason",
      createdAt: 1666243083,
    };
    const newReward = await repository.save(reward);
    return { reward: newReward, user };
  }

  public async setPassword(admin, password) {
    const repository = getConnection().getRepository(Admin);
    admin.password = await Hash.make(password);
    admin.status = AccountStatus.ACTIVE;
    admin.emailConfirmed = true;
    admin.twoFa = !admin.twoFa;
    admin.twoFaKey = this.testUserDto.code;
    return await repository.save(admin);
  }

  public async silverBellProcess() {
    const silverBellRepo = getConnection().getRepository(SilverBellRequest)
    const silverBell = new SilverBellRequest();
    silverBell.applicantEmail = 'test_fingerate_admin_helper@yopmail.com';
    silverBell.applicantName = 'Test User Name';
    silverBell.applicantPhoneNumber = '03001234567';
    silverBell.applicantCompany = 'Dummy Company';
    silverBell.country = "Korea";
    silverBell.createdAt = 1666757847;
    silverBell.status = SilverBellRequestStatus.IN_PROGRESS;
    silverBell.surveyCountry = "Korea";
    return await silverBellRepo.save(silverBell);
  }

  /**
   * Login a test user
   * @returns
   */
  public async login(mail: string, pass: string) {
    const testUserDto = {
      email: mail,
      password: pass,
    };
    await request(this.app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('user-agent', 'chrome')
      .send(testUserDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
        this.token = body.data.token;
      });
    return this.token;
  }

  /**
   * verify a test user 2fa
   * @returns
   */
  public async verify2fa(twoFAToken, code) {
    const twoFACode = {
      code: generateToken(`${code}`)
    };
    await request(this.app.getHttpServer())
      .post('/api/admin/auth/verify_2fa')
      .set('user-agent', 'chrome')
      .set('Authorization', `Bearer ${twoFAToken}`)
      .send(twoFACode)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
        this.token = body.data.token;
      });
    return this.token;
  }


  public async creatAdmin(email) {
    let admin = new Admin();
    admin.email = email;
    let adminRepository = getConnection().getRepository(Admin);
    return await adminRepository.save(admin);
  }

  /**
   * create a single user
   * @returns
   */
  public async createUser(email: string) {
    return this.appHelper.createUser(email);
  }

  /**
   * create a single user
   * @returns
   */
  public getJob() {
    return this.appHelper.getJob();
  }

  /**
   * get Survery Option
   */
  public async getSurveyOption(survey) {

    return await this.appHelper.getSurveyOption(survey);
  }

  /**
   * create a survey process
   */
  public async createSurveyProcess() {
    const user = await this.appHelper.createUser('newTestUser@yopmail.com');
    const participant = await this.appHelper.createUser('newParticipantTestUser@yopmail.com');
    const survey = await this.appHelper.createSurvey(user);
    const sot = await this.appHelper.createSot();
    await this.appHelper.assignSurveyToSot(survey.uuid, sot.uuid);
    const surveyOption = await this.appHelper.createSurveyOption(survey);
    const surveyComment = await this.appHelper.createSurveyComment();
    await this.appHelper.createSurveyParticipant(survey, participant, surveyOption, surveyComment);
    await this.appHelper.createSurveyOption(survey);
    return { user, survey, sot };
  }

  public async getUserByEmail(email) {
    return await this.appHelper.getUserByEmail(email);
  }

  public async updateUser(user) {
    return this.appHelper.updateUser(user);
  }

  public async setupCustomerServiceProcess() {
    const user = await this.createUser('newTestUser@yopmail.com');
    const inquiry: Inquiry = new Inquiry()
    inquiry.title = 'I am the title';
    inquiry.content = 'I am the content';
    inquiry.status = 'Waiting For An Answer';
    inquiry.user = user;
    const inquiryRepo = getConnection().getRepository(Inquiry);
    return await inquiryRepo.save(inquiry);
  }

  /**
   * create a payment
   */
  public async createPayment(user: User) {
    const avatar = await this.appHelper.createAvatarItem('Black');
     const order = await this.appHelper.createOrder(user);

    let userItemCollection = new UserItemCollection();
    userItemCollection.itemId = avatar;
    userItemCollection.userId = user;
    let userItemCollectionRepository = getConnection().getRepository(UserItemCollection);
    userItemCollectionRepository.save(userItemCollection)

    let payment = new Payment();
    payment.paymentStatus = PaymentStatus.COMPLETED;
    payment.type = PaymentType.PURCHASE;
    payment.amount = 500;
    payment.transactionType = TransactionType.OUTBOUND;
    payment.wallet = user.wallet;
    payment.orderId = order;
    let paymentRepository = getConnection().getRepository(Payment);
    return await paymentRepository.save(payment);
  }

  /**
  * make a recharge
  */
  public async makeRecharge(user: User) {
    let walletRecharge = new WalletRecharge();
    walletRecharge.amountInSom = 400;
    walletRecharge.amountInUsd = 40;
    walletRecharge.type = PaymentType.RECHARGE;
    walletRecharge.transactionType = TransactionType.INBOUND;
    walletRecharge.wallet = user.wallet;
    let walletRechargeRepository = getConnection().getRepository(WalletRecharge);
    return await walletRechargeRepository.save(walletRecharge);
  }

  /**
  * give a reward
  */
  public async giveReward(user: User) {
    let reward = new Reward();
    reward.type = RewardType.INFO_COMPLETION;
    reward.amount = InfoReward.THIRTY;
    reward.transactionType = TransactionType.OUTBOUND;
    reward.wallet = user.wallet;
    let rewardRepository = getConnection().getRepository(Reward);
    return await rewardRepository.save(reward);
  }


  /**
   * Add avatar item in wishlist
   */
   public async addAvatarInWishList(user: User) {
    const avatar = await this.appHelper.createAvatarItem('Black');
    let wishList = new UserItemWishlist();
    wishList.itemId = avatar;
    wishList.userId = user;
    let wishListRepository = getConnection().getRepository(UserItemWishlist);
    return await wishListRepository.save(wishList);
  }
}
