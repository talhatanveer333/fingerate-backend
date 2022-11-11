import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import request from 'supertest';
import { User } from '../src/modules/user/user.entity';
import { Hash } from '../src/utils/Hash';
import { WebSocketServer } from 'ws';
import { Survey } from '../src/modules/survey/survey.entity';
import { UserWallet } from '../src/modules/user/userwallet.entity';
import { Sot } from '../src/modules/sot/sot.entity';
import { Media } from '../src/modules/media/media.entity';
import { SurveyStatus } from '../src/modules/survey/common/survey.enums';
import { SurveyOption } from '../src/modules/survey/surveyoptions.entity';
import { SurveyParticipant } from '../src/modules/survey/surveyparticipant.entity';
import { UserAvatar } from '../src/modules/user/useravatar.entity';
import { Helper } from './abstaract.helper';
import dayjs from 'dayjs';
import { FAQ } from '../src/modules/faq/faq.entity';
import { WalletRecharge } from '../src/modules/payment/walletrecharge.entity';
import { UserSessionInfo } from '../src/modules/user/usersessioninfo.entity';
import { UserNotification } from '../src/modules/user/notification.entity';
import {
  NotificationBody,
  NotificationTitle,
  NotificationType,
} from '../src/utils/notification/common/index.enums';
import { EventAttendance } from '../src/modules/event/eventattendance.entity';
import { EventType } from '../src/modules/event/common/event.enums';
import { SurveyComment } from '../src/modules/survey/surveycomment.entity';
import { AvatarItem } from '../src/modules/marketplace/avataritem.entity';
import {
  AvatarCategoryEnum,
  AvatarColorEnum,
  AvatarGenderEnum,
  AvatarItemNameEnum,
  AvatarStatusEnum,
} from '../src/modules/marketplace/common/marketplace.enums';
import { Notice } from '../src/modules/notice/notice.entity';
import { Cart } from '../src/modules/marketplace/cart.entity';
import { Order } from '../src/modules/marketplace/order.entity';
import { EventBanner } from '../src/modules/eventbanner/eventbanner.entity';
import { AvatarBanner } from '../src/modules/avatarbanner/avatarbanner.entity';
import { OrderItem } from '../src/modules/marketplace/orderitem.entity';
import { PendingProfit } from '../src/modules/payment/pendingprofit.entity';

export class AppHelper extends Helper {
  private testWebSocketServer: WebSocketServer;

  constructor(app: INestApplication) {
    super(app);
  }

  /**
   * Initialize testsuite
   * @returns accessToken
   */
  public async init() {
    const email = `testuser@yopmail.com`;
    const repository = getConnection().getRepository(User);
    const exists = await repository.findOne({ email });
    if (!exists) {
      await this.createUser(email);
    }

    await this.login(email, 'Test!234');
    return this.token;
  }

  /**
   * Register a test user
   * @returns
   */
  public async register() {
    const testUserDto = {
      userName: 'test_user',
      email: 'testuser@yopmail.com',
      country: 'Pakistan',
      phoneNumber: '+923333333333',
      password: 'aPass12d@',
      passwordConfirmation: 'aPass12d@',
    };

    await request(this.app.getHttpServer())
      .post('/api/auth/register')
      .send(testUserDto)
      .expect(201);
    return;
  }

  /**
   * Login a test user
   * @returns
   */
  public async login(mail: string, pass: string) {
    const testUserDto = {
      email: mail,
      password: pass,
      autoLogin: false,
    };
    await request(this.app.getHttpServer())
      .post('/api/auth/login')
      .set('deviceinfo', '{}')
      .send(testUserDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
        this.token = body.data;
      });
  }

  /**
   * Create New User By Email
   */
  public async createUser(email: string): Promise<User> {
    let user = new User();
    user.email = email;
    user.isActive = true;
    user.gender = 'male';
    user.loginType = 'system';
    user.age = 1990;
    user.referralCode = 'test321HFJ';
    user.password = await Hash.make('Test!234');
    let userReposity = getConnection().getRepository(User);
    user = await userReposity.save(user);
    await this.initializeUserAvatar(user);
    await this.initializeWallet(user);
    await this.initializeSessionInfo(user);
    await this.initializeUserCart(user);
    return user;
  }

  public async createSurvey(user: any): Promise<Survey> {
    let survey = new Survey();
    survey.totalSots = 5;
    survey.status = SurveyStatus.DISABLED;
    survey.question = 'Test survery';
    survey.type = 'single';
    survey.initiator = user;
    survey.rewardeesCount = 10;
    survey.rewardAmount = 5;
    survey.startingDate = dayjs().add(1, 'day').unix();
    survey.endingDate = dayjs().add(2, 'day').unix();
    survey.email = user.email;
    let surveyRepository = getConnection().getRepository(Survey);
    return await surveyRepository.save(survey);
  }

  public async rechargeUserWallet(wallet: any) {
    const walletRecharge = new WalletRecharge();
    walletRecharge.amountInUsd = 10;
    walletRecharge.amountInSom = 100;
    walletRecharge.type = 'Wallet Recharge';
    walletRecharge.wallet = wallet;
    let walletRechargeRepository =
      getConnection().getRepository(WalletRecharge);
    return await walletRechargeRepository.save(walletRecharge);
  }
  public async initializeWallet(user: any) {
    let userwallet = new UserWallet();
    userwallet.balance = 5000;
    let userWalletRepository = getConnection().getRepository(UserWallet);
    let userReposity = getConnection().getRepository(User);
    user.wallet = await userWalletRepository.save(userwallet);
    await userReposity.save(user);
    return;
  }

  public async initializeUserAvatar(user: any) {
    let userAvatar = new UserAvatar();
    userAvatar.avatar =
      '{"Avatar":"female","Hairs":"long","Top":"nosleves","Bottom":"","Shoes":"long","Skintone":"white"}';
    let userAvatarRepo = getConnection().getRepository(UserAvatar);
    let userReposity = getConnection().getRepository(User);
    user.avatar = await userAvatarRepo.save(userAvatar);
    await userReposity.save(user);
    return;
  }

  public async initializeSessionInfo(user: any) {
    const userSessionInfo = new UserSessionInfo();
    let userSessionInfoRepo = getConnection().getRepository(UserSessionInfo);
    let userReposity = getConnection().getRepository(User);
    user.sessionInfo = await userSessionInfoRepo.save(userSessionInfo);
    await userReposity.save(user);
    return;
  }

  public async initializeUserCart(user: any) {
    const cart = new Cart();
    cart.user = user;
    let cartRepo = getConnection().getRepository(Cart);
    let userReposity = getConnection().getRepository(User);
    user.cart = await cartRepo.save(cart);
    await userReposity.save(user);
    return;
  }

  public async createMedia(key: string) {
    let media = new Media();
    media.key = key;
    let mediaRepository = getConnection().getRepository(Media);
    return await mediaRepository.save(media);
  }

  public async createFAQ() {
    let faq = new FAQ();
    faq.title = 'Title';
    faq.content = 'Content';
    faq.status = 'Active';
    faq.image = 'SomeRandomKey';
    const faqRepository = getConnection().getRepository(FAQ);
    return await faqRepository.save(faq);
  }

  /**
   * Create event banner
   * @returns event banner
   */
  public async createEventBanner() {
    let eventBanner = new EventBanner();
    eventBanner.title = 'Title';
    eventBanner.content = 'Content';
    eventBanner.status = 'Active';
    eventBanner.image = 'SomeRandomKey';
    eventBanner.pushLink = 'www.test.com';
    const eventBannerRepository = getConnection().getRepository(EventBanner);
    return await eventBannerRepository.save(eventBanner);
  }

  /**
   * Create avatar banner
   * @returns avatar banner
   */
  public async createAvatarBanner() {
    let avatarBanner = new AvatarBanner();
    avatarBanner.status = 'Active';
    avatarBanner.image = 'SomeRandomKey';
    avatarBanner.pushLink = 'https://www.test.com';
    const avatarBannerRepository = getConnection().getRepository(AvatarBanner);
    return await avatarBannerRepository.save(avatarBanner);
  }

  /**
   *
   * @returns
   */
  public async createNotice() {
    let notice = new Notice();
    notice.title = 'Title';
    notice.content = 'Content';
    notice.status = 'Active';
    notice.image = 'SomeRandomKey';
    const noticeRepository = getConnection().getRepository(Notice);
    return await noticeRepository.save(notice);
  }

  /**
   * get Survey
   */
  public async getSurveyById(id: string) {
    let surveyReposity = getConnection().getRepository(Survey);
    return await surveyReposity.findOne(id);
  }

  /**
   * get Survey Commments
   */
  public async getSurveyCommentById(surveyId: string) {
    let surveyParticipantReposity =
      getConnection().getRepository(SurveyParticipant);
    const surveycomment = await surveyParticipantReposity.findOne({
      where: { surveyId: surveyId },
      relations: ['surveyComment'],
    });
    return surveycomment;
  }

  /**
   * get Survey
   */
  public async updateSurvey(survey: Survey) {
    let surveyReposity = getConnection().getRepository(Survey);
    return await surveyReposity.save(survey);
  }

  /**
   * get Survery
   */
  public async getSurveyDetail(id: string) {
    let surveyReposity = getConnection().getRepository(Survey);
    return await surveyReposity.findOne({
      where: {
        uuid: id,
      },
    });
  }

  /**
   * get Survery Option On
   */
  public async getSurveyOption(survey) {
    let surveyOptionReposity = getConnection().getRepository(SurveyOption);
    return await surveyOptionReposity.findOne({
      where: {
        survey: survey,
      },
    });
  }

  /**
   * Create New Sot
   */
  public async createSot(): Promise<Sot> {
    let sot = new Sot();
    sot.name = 'Pakistan';
    (sot.city = 'Seoul'),
      (sot.country = 'South Korea'),
      (sot.grade = 'C'),
      (sot.latitude = 126.9971466);
    sot.longitude = 37.58489353;
    sot.image = 'http://s3.com/giph.jpg';
    sot.owner = '0xsadffsdfsdfs9wur3847fydsf7s98d7vx';
    sot.createdAt = 1678953;
    sot.uniqueId = 'AUT00001';
    let SotReposity = getConnection().getRepository(Sot);
    return await SotReposity.save(sot);
  }

  public async getSot() {
    let SotReposity = getConnection().getRepository(Sot);
    return await SotReposity.findOne({ grade: 'S' });
  }

  /**
   * Assign Survey To sot
   */
  public async assignSurveyToSot(
    surveyId: string,
    sotId: string,
  ): Promise<void> {
    let sql = `INSERT INTO sots_surveys ( "surveyId", "sotId")
               VALUES ('${surveyId}', '${sotId}')`;
    await getConnection().query(sql);
    return;
  }

  /**
   * Create New Survey Option
   */
  public async createSurveyOption(survery: Survey): Promise<SurveyOption> {
    let surveyOption = new SurveyOption();
    surveyOption.name = 'good';
    surveyOption.description = 'Testing';
    surveyOption.image = '';
    surveyOption.colour = '#DF6GTYH';
    surveyOption.survey = survery;
    let SurveyOptionReposity = getConnection().getRepository(SurveyOption);
    return await SurveyOptionReposity.save(surveyOption);
  }

  /**
   * Create New Survey Comment
   */
  public async createSurveyComment(): Promise<SurveyComment> {
    let surveyComment = new SurveyComment();
    surveyComment.likes = 5;
    surveyComment.body = 'test';
    let SurveyCommentReposity = getConnection().getRepository(SurveyComment);
    return await SurveyCommentReposity.save(surveyComment);
  }

  /**
   * Create New Survey Particpant
   */
  public async createSurveyParticipant(
    survery: Survey,
    user: User,
    surveyOption: SurveyOption,
    surveyComment: SurveyComment,
  ): Promise<void> {
    let surveyparticipant = new SurveyParticipant();
    surveyparticipant.surveyId = survery;
    surveyparticipant.userId = user;
    surveyparticipant.OptionId = surveyOption;
    surveyparticipant.surveyComment = surveyComment;
    let SurveyParticipantReposity =
      getConnection().getRepository(SurveyParticipant);
    await SurveyParticipantReposity.save(surveyparticipant);
    return;
  }

  public removeReceivedExtraFields(object: any) {
    const {
      uuid,
      createdAt,
      sessionInfo,
      notificationSetting,
      respectPolicy,
      ...newObject
    } = object;
    return newObject;
  }

  public removeUserExtraFields(user: User) {
    user.age = dayjs().year() - user.age;
    const {
      password,
      referralCode,
      referredBy,
      loginType,
      uuid,
      createdAt,
      ...newUser
    } = user;
    return newUser;
  }

  /**
   * Update User
   */
  public async updateUser(obj: User) {
    let userReposity = getConnection().getRepository(User);
    return await userReposity.save(obj);
  }

  /**
   * Get Pending Profit
   * @param obj
   * @returns
   */
  public async getPendingProfit() {
    let pendingProfitRepository = getConnection().getRepository(PendingProfit);
    let pendingProfit = await pendingProfitRepository.find();
    return pendingProfit[0];
  }

  /**
   *  get user by email
   */
  public async getUserByEmail(email: string) {
    let userReposity: Repository<User>;
    userReposity = this.app.get('UserRepository');
    let user = await userReposity.findOne({
      where: { email },
      relations: ['wallet', 'cart'],
    });
    return user;
  }

  /**
   *  get user by email
   */
  public async getUser(email: string) {
    let userReposity: Repository<User>;
    userReposity = this.app.get('UserRepository');
    return await userReposity.findOne(
      { email },
      {
        relations: ['wallet'],
      },
    );
  }

  /**
   *
   */
  public startTestWebSocketServer() {
    try {
      this.testWebSocketServer = new WebSocketServer({ port: 1234 });
    } catch (e) {
      console.error('Unable to start Mock WebSocketServer', e);
    }
  }

  public getJob() {
    try {
      const jobData = {
        event: {
          blockNumber: 14567890,
          returnValues: {
            tokenId: '0',
          },
        },
      };
      return jobData;
    } catch (e) {
      console.error('Unable to start Mock WebSocketServer', e);
    }
  }

  /**
   *
   */
  public stopTestWebSocketServer() {
    try {
      this.testWebSocketServer.close();
    } catch (e) {
      console.error('Unable to stop Mock WebSocketServer', e);
    }
  }

  /**
   * Create Notification
   */
  public async createUserNotification(user: User): Promise<UserNotification> {
    let userNotification: UserNotification = new UserNotification();
    userNotification.type = NotificationType.SURVEY_GOES_LIVE;
    userNotification.body = NotificationBody.SURVEY_GOES_LIVE;
    userNotification.title = NotificationTitle.SURVEY_GOES_LIVE;
    userNotification.user = user;
    let userNotificationReposity =
      getConnection().getRepository(UserNotification);
    return await userNotificationReposity.save(userNotification);
  }

  /**
   * create User Attendance
   */
  public async createUserAttendance(user: User): Promise<EventAttendance> {
    let eventAttendance: EventAttendance = new EventAttendance();
    eventAttendance.user = user;
    eventAttendance.type = EventType.ATTENDANCE;
    let eventReposity = getConnection().getRepository(EventAttendance);
    return await eventReposity.save(eventAttendance);
  }

  /**
   * create Avatar Item
   */
  public async createAvatarItem(color: string): Promise<AvatarItem> {
    let item = new AvatarItem();
    item.gender = AvatarGenderEnum.MALE;
    item.category = AvatarCategoryEnum.HAIRS;
    item.item_name = AvatarItemNameEnum.MALELONGHAIRS;
    item.color = color;
    item.status = AvatarStatusEnum.ACTIVE;
    item.price = 10;
    let avatarItemRepository = getConnection().getRepository(AvatarItem);
    return await avatarItemRepository.save(item);
  }

  /**
   * create Order
   */
  public async createOrder(user: User): Promise<Order> {
    let order = new Order();
    order.totalAmount = 500;
    order.user = user;
    let orderRepository = getConnection().getRepository(Order);
    return await orderRepository.save(order);
  }

  /**
   * create Order item
   */
  public async createOrderItem(
    item: AvatarItem,
    order: Order,
  ): Promise<OrderItem> {
    let orderItem = new OrderItem();
    orderItem.itemId = item;
    orderItem.orderId = order;
    let orderItemRepository = getConnection().getRepository(OrderItem);
    return await orderItemRepository.save(orderItem);
  }

  public async getOrders() {
    let orderItemRepository = getConnection().getRepository(Order);
    return await orderItemRepository.find({
      relations: ['user', 'user.wallet'],
    });
  }
}
