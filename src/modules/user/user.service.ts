import {
  HttpException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Hash } from '../../utils/Hash';
import { RegisterPayload } from './../auth/register.payload';
import { getConnection, ILike, QueryRunner, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { User, UserFillableFields } from './user.entity';
import dayjs from 'dayjs';
import { UserAvatar } from './useravatar.entity';
import {
  ChangeNickNameDto,
  ChangePasswordDto,
  NotificationSettingDto,
  TransactionFilterDto,
  WithdrawMembershipDto,
} from './common/user.dtos';
import { UserWallet } from './userwallet.entity';
import { LoginType, UserStatusEnum } from '../auth/common/auth.enums';
import { UserNotificationSetting } from './notificationsetting.entity';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import {
  InfoReward,
  RespectLevel,
  RespectLevelPoints,
  RespectLevelPolicyPoints,
  TransactionEnum,
} from './common/user.enums';
import { IAvatar, ITransactionFilters } from './common/user.types';
import { UserSessionInfo } from './usersessioninfo.entity';
import { UserNotification } from './notification.entity';
import { CacheManagerService } from '../../modules/cache-manager/cache-manager.service';
import { UserItemCollection } from './useritemcollection.entity';
import { IRewardPayload } from '../../modules/survey/common/survey.interface';
import { RewardType } from '../../modules/payment/common/payment.enums';
import { Reward } from '../../modules/payment/reward.entity';
import { PaymentType } from '../payment/common/payment.enums';
import { UserStatusHistory } from './user-status-history.entity';
import { AvatarItem } from '../../modules/marketplace/avataritem.entity';
import {
  AvatarGenderEnum,
  AvatarItemNameEnum,
  AvatarStatusEnum,
} from '../../modules/marketplace/common/marketplace.enums';
import { S3Service } from '../../utils/s3/s3.service';
import { UserRespectPolicy } from './userrespectpolicy.entity';
import { PhoneNumberVerifyDTO } from '../../modules/auth/common/auth.dtos';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAvatar)
    private readonly userAvatarRepository: Repository<UserAvatar>,
    @InjectRepository(UserWallet)
    private readonly userWalletRepository: Repository<UserWallet>,
    @InjectRepository(UserNotificationSetting)
    private readonly userNotificationSettingRepository: Repository<UserNotificationSetting>,
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    @InjectRepository(UserSessionInfo)
    private readonly userSessionInfoRepository: Repository<UserSessionInfo>,
    @InjectRepository(UserRespectPolicy)
    private readonly userRespectRewardRepository: Repository<UserRespectPolicy>,
    @InjectRepository(UserStatusHistory)
    private readonly userStatusHistoryRepository: Repository<UserStatusHistory>,
    @InjectRepository(UserItemCollection)
    private readonly userItemCollectionRepository: Repository<UserItemCollection>,
    private readonly cacheManagerService: CacheManagerService,
    private readonly s3Service: S3Service,
  ) { }

  /**
   * Check active status from user 
   * 
   * @param user: User
   * @param checkActive 
   */
  checkUserActiveStatus(user: User, checkActive = true) {
    if (!user.isActive && checkActive) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_VERIFIED,
          message: ResponseMessage.EMAIL_NOT_VERIFIED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (user.status === UserStatusEnum.DISABLED) {
      throw new HttpException(
        {
          statusCode: ResponseCode.TEMPORARY_BLOCK,
          message: ResponseMessage.TEMPORARY_BLOCK,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (user.status === UserStatusEnum.TERMINATED) {
      throw new HttpException(
        {
          statusCode: ResponseCode.ACCOUNT_TERMINATED,
          message: ResponseMessage.ACCOUNT_TERMINATED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (user.withdrawExpiry && user?.withdrawExpiry >= dayjs().unix()) {
      throw new HttpException(
        {
          statusCode: ResponseCode.MEMBERSHIP_EXPIRY_FOR_SIX_MONTH,
          message: ResponseMessage.MEMBERSHIP_EXPIRY_FOR_SIX_MONTH,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
  }

  /**
   * Get User By uuid with relations
   *
   * @param uuid
   * @returns user
   */
  async get(uuid: string) {
    return await this.userRepository.findOne(
      { uuid },
      {
        relations: [
          'wallet',
          'avatar',
          'sessionInfo',
          'notificationSetting',
          'cart',
          'respectPolicy',
        ],
      },
    );
  }

  /**
   * Get User By Email with relation
   *
   * @param email
   * @param relation?: string[]
   * @returns user
   */
  async getByEmail(email: string, relation?: string[]): Promise<User> {
    return await this.userRepository.findOne({
      where: {
        email: ILike(email),
      },
      relations: relation,
    });
  }

  /**
   * Get User By Email with relation
   *
   * @param email
   * @param relation?: string[]
   * @returns user
   */
  async searchByEmail(email: string, relation?: string[]): Promise<User[]> {
    return await this.userRepository.find({
      where: {
        email: ILike(`%${email}%`),
      },
      relations: relation,
      select: ['email', 'nickName', 'uuid'],
      take: 10,
    });
  }

  /**
   * Get when User status is active By Email
   *
   * @param email
   * @returns user
   */
  async getActiveUser(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        isActive: true,
      },
    });
    if (!user) {
      throw new HttpException(
        ResponseMessage.EMAIL_NOT_REGISTERED,
        ResponseCode.BAD_REQUEST,
      );
    }
    return user;
  }

  /**
   * Create new user
   *
   * @param payload:UserFillableFields
   * @returns
   */
  async create(payload: UserFillableFields) {
    const user = await this.getByEmail(payload.email);

    if (user) {
      throw new NotAcceptableException(
        'User with provided email already created.',
      );
    }

    return await this.userRepository.save(payload);
  }

  /**
   * Save User with user fields
   *
   * @returns
   * @param user:User
   */
  async save(user: User) {
    return await this.userRepository.save(user);
  }

  /**
   * Save User status history
   *
   * @param user
   * @param status
   * @param reason
   * @returns
   */
  async addUserStatusHistory(
    user: User,
    status: UserStatusEnum,
    reason: string,
  ) {
    const history = new UserStatusHistory();
    history.user = user;
    history.status = status;
    history.reason = reason;
    return await this.userStatusHistoryRepository.save(history);
  }

  /**
   * Update User Info From Signup
   *
   * @param user: User
   * @param payload: RegisterPayload
   * @returns
   */
  public async updateUserInfo(user: User, payload: RegisterPayload) {
    user.age = payload.age;
    user.gender = payload.gender;
    user.nickName = payload.nickName;
    return await this.userRepository.save(user);
  }

  /** Initialize Info Reward
   *
   * @param  user User
   * @returns
   */
  public async initGiveInfoReward(user: User) {
    return new Promise<User>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.updateWallet(user, queryRunner);
        await this.createReward(user, queryRunner);
        user.respectPolicy.infoReward = true;
        await queryRunner.manager.save(user.respectPolicy);
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

  /**
   * Update User Wallet
   *
   * @param user: User
   * @param queryRunner: QueryRunner
   * @returns
   */
  public async updateWallet(user: User, queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        user.wallet.balance += InfoReward.THIRTY;
        user.wallet.totalReceived += InfoReward.THIRTY;
        await queryRunner.manager.save(user.wallet);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create Reward
   *
   * @param user:User
   * @param queryRunner: QueryRunner
   * @returns
   */
  public async createReward(user: User, queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const rewardPayload: IRewardPayload = {
          amount: InfoReward.THIRTY,
          wallet: user.wallet,
          type: RewardType.INFO_COMPLETION,
        };
        const reward: Reward = new Reward().fromDto(rewardPayload);
        await queryRunner.manager.save(reward);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * update User Avatar
   *
   * @param user: User
   * @param avatar: string
   * @returns
   */
  public async updateUserAvatar(user: User, avatar: string) {
    const userWithAvatar = await this.get(user.uuid);
    const userAvatar = userWithAvatar.avatar;
    userAvatar.avatar = avatar;
    return await this.userAvatarRepository.save(userAvatar);
  }

  /**
   * Update User Profile Image
   *
   * @param user: User
   * @param avatar: string
   * @returns
   */
  public async updateUserProfileImage(user: User, avatar: string) {
    const avatarObject: IAvatar = JSON.parse(avatar);
    const profileImageKey = this.getProfileImageKey(avatarObject.Avatar, avatarObject.Hairs);
    user.profileImage = this.s3Service.getPublicURL(profileImageKey);
    await this.userRepository.save(user);
  }


  /**
   * Get User Profile Image Key
   * 
   *@param gender string
   *@param hairs string
   *@ret
   */
  public getProfileImageKey(gender: string, hairs: string) {
    return `faces/${gender}-${hairs}.png`;
  }

  /**
   * Update user password
   *
   * @param email
   * @param password
   * @returns
   */
  public async updatePassword(email: string, password: string) {
    return await this.userRepository.update({ email }, { password });
  }

  /**
   * make hash password and update password
   *
   * @param email
   * @param password
   * @returns
   */
  public async confirmForgotPassword(email: string, password: string) {
    const passwordHash = await Hash.make(password);
    return await this.updatePassword(email, passwordHash);
  }

  /**
   * Make Hash Password and create Password
   *
   * @param email
   * @param password
   * @returns
   */
  public async createPassword(email: string, password: string) {
    const passwordHash = await Hash.make(password);
    return await this.updatePassword(email, passwordHash);
  }

  /**
   * check whether Nick Name Exist on user table
   *
   * @param nickName
   * @returns
   */
  public async checkNickName(
    nickName: string,
  ): Promise<{ message: string; available: boolean }> {
    const user = await this.userRepository.findOne({
      nickName: ILike(`${nickName}`),
    });
    let message: string = ResponseMessage.NICKNAME_CAN_BE_USE;
    if (user) {
      message = ResponseMessage.NICKNAME_ALREADY_EXIST;
    }
    return { message, available: !user };
  }

  /** check whether Referral Code exist on user table
   * 
   * @param referralCode
   * @param email
   * @returns
   */
  public async checkReferralCode(referredBy: string, email: string) {
    const referralUser = await this.userRepository.findOne({
      where: {
        referralCode: ILike(`${referredBy}`),
        isActive: true,
      },
    });
    if (!referralUser) {
      throw new HttpException(
        {
          statusCode: ResponseCode.REFERRER_NOT_EXIST,
          message: ResponseMessage.REFERRER_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    referralUser.respectLevelPoints +=
      RespectLevelPolicyPoints.REFERRAL_PER_PERSON;
    referralUser.respectLevel = this.getUserRespectLevel(referralUser);
    await this.save(referralUser);
    return await this.userRepository.update({ email }, { referredBy });
  }

  /** 
   * update User Login Token
   * 
   * @param user
   * @param loginToken
   * @param deviceInfo
   * @returns
   */
  public async updateLoginToken(
    user: User,
    loginToken: string,
    deviceInfo?: string,
  ) {
    const usersessioninfo = user.sessionInfo;
    usersessioninfo.deviceInfo = deviceInfo || usersessioninfo.deviceInfo;
    usersessioninfo.loginToken = loginToken;
    usersessioninfo.lastLogin = dayjs().unix();
    await this.userSessionInfoRepository.save(usersessioninfo);
    return;
  }

  /** 
   * Check whether phone number exist on user table
   *
   * @param phoneNumber
   * @returns user
   */
  public async checkPhoneNumberExists(phoneNumber: string) {
    const user: User = await this.userRepository.findOne({
      where: {
        phoneNumber,
      },
    });

    return !!user;
  }

  /**
   * find phone number and update phone number 
   *
   * @param email
   * @param phoneNumber
   * @returns
   */
  public async updatePhoneNumber(email: string, body: PhoneNumberVerifyDTO) {
    const user: User = await this.userRepository.findOne({ email });
    if (user) {
      return await this.userRepository.update({ email }, { phoneNumber: body.phoneNumber, country: body.country });
    } else {
      throw new HttpException(
        ResponseMessage.USER_DOES_NOT_EXIST,
        ResponseCode.NOT_FOUND,
      );
    }
  }

  /**
   * get User Details by user
   * 
   * @param user
   * @returns user
   */
  public async getUserDetails(user: User) {
    user.age = dayjs().year() - user.age;
    const { password, referralCode, referredBy, loginType, ...newUser } = user;
    return { ...newUser, avatar: user.avatar };
  }

  /**
   * change user login Password
   * 
   * @param email
   * @param loginType
   * @param payload
   * @returns
   */
  public async changePassword(
    email: string,
    loginType: string,
    payload: ChangePasswordDto,
  ): Promise<User> {
    if (loginType !== LoginType.SYSTEM) {
      throw new HttpException(
        {
          message: ResponseMessage.INVALID_LOGIN_TYPE,
          statusCode: ResponseCode.INVALID_LOGIN_TYPE,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const user = await this.getByEmail(email);
    if (!user) {
      throw new HttpException(
        {
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const isValidPassword = await Hash.compare(
      payload.currentPassword,
      user.password,
    );
    if (!isValidPassword) {
      throw new HttpException(
        {
          message: ResponseMessage.INCORRECT_CURRENT_PASS,
          statusCode: ResponseCode.INCORRECT_CURRENT_PASS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const samePassword = await Hash.compare(payload.newPassword, user.password);

    if (samePassword) {
      throw new HttpException(
        {
          message: ResponseMessage.SAME_AS_OLD_PASS,
          statusCode: ResponseCode.SAME_AS_OLD_PASS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    user.password = await Hash.make(payload.newPassword);
    return await this.userRepository.save(user);
  }

  /**
   * change User Nick Name and Save Nick Name
   * 
   * @param email
   * @param user: User,
   * @param payload: ChangeNickNameDto
   * @returns
   */
  public async changeNickName(
    user: User,
    payload: ChangeNickNameDto,
  ): Promise<User> {
    const { available } = await this.checkNickName(payload.nickName);
    if (!available) {
      throw new HttpException(
        {
          statusCode: ResponseCode.BAD_REQUEST,
          message: ResponseMessage.NICKNAME_ALREADY_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    user.nickName = payload.nickName;
    return await this.userRepository.save(user);
  }

  /** ******************************************************************************************************************/

  /*
    /*                                    Membership Withdraw
    /*
    /********************************************************************************************************************/

  /**
   * Withdraw User Membership for 6 month
   *
   * @body payload
   * @param user: User
   * @returns
   */
  public async withdrawMembership(
    payload: WithdrawMembershipDto,
    user: User,
  ): Promise<void> {
    const userObj = await this.getByEmail(payload.email);
    if (user.email !== payload.email) {
      throw new HttpException(
        {
          message: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
          statusCode: ResponseCode.INVALID_USERNAME_OR_PASSWORD,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (
      user.loginType === LoginType.SYSTEM &&
      !(await Hash.compare(payload.password, userObj.password))
    ) {
      throw new HttpException(
        {
          message: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
          statusCode: ResponseCode.INVALID_USERNAME_OR_PASSWORD,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    userObj.withdrawExpiry = dayjs().add(6, 'months').unix();
    userObj.respectLevel =
      Number(userObj.respectLevel - 1) > 0
        ? Number(userObj.respectLevel - 1)
        : 1;
    userObj.respectLevelPoints = this.getUserRespectPointsByLevel(
      userObj.respectLevel,
    );
    await this.userRepository.save(userObj);
    return;
  }

  /**
   * decrement User Level according to respect level
   *
   * @param user: User
   * @returns level
   */
  public decrementUserLevel(user: User) {
    let level = 1;
    if (
      user.respectLevel === RespectLevel.SEVEN ||
      user.respectLevel === RespectLevel.SIX
    ) {
      level = Number(user.respectLevel - 2);
    } else {
      level = Number(user.respectLevel - 1);
    }
    return level <= 0 ? 1 : level;
  }

  /**
   * get User Respect Points on basis of level of user
   *
   * @param level: number
   * @returns points
   */
  public getUserRespectPointsByLevel(level: number) {
    let points = 0;
    switch (level) {
      case RespectLevel.SEVEN:
        points = Number(RespectLevelPoints.NINE_FIFTY + 1);
        break;
      case RespectLevel.SIX:
        points = RespectLevelPoints.SEVEN_HUNDRED_ONE;
        break;
      case RespectLevel.FIVE:
        points = RespectLevelPoints.FOUR_SEVENTY_SIX;
        break;
      case RespectLevel.FOUR:
        points = RespectLevelPoints.THREE_HUNDRED_ONE;
        break;
      case RespectLevel.THREE:
        points = RespectLevelPoints.ONE_FIFTY_ONE;
        break;
      case RespectLevel.TWO:
        points = RespectLevelPoints.FIFTY_ONE;
        break;
    }
    return points;
  }

  /**
   * initialize Wallet 
   *
   * @param user
   * @returns
   */
  public async initializeWallet(user: User): Promise<void> {
    const userwallet: UserWallet = new UserWallet();
    user.wallet = await this.userWalletRepository.save(userwallet);
    await this.userRepository.save(user);
    return;
  }

  /**
   * Initialize User Session Info
   *
   * @param user
   * @returns
   */
  public async initializeUserSessionInfo(user: User): Promise<void> {
    const userSessionInfo: UserSessionInfo = new UserSessionInfo();
    user.sessionInfo = await this.userSessionInfoRepository.save(
      userSessionInfo,
    );
    await this.userRepository.save(user);
    return;
  }


  /**
   * Initialize User Respect Reward
   *
   * @param user
   * @returns
   */
  public async initializeUserRespectReward(user: User): Promise<void> {
    const userRespectPolicy: UserRespectPolicy = new UserRespectPolicy();
    user.respectPolicy = await this.userRespectRewardRepository.save(
      userRespectPolicy,
    );
    await this.userRepository.save(user);
    return;
  }

  /**
   * Initialize User Avatar
   *
   * @param user
   * @returns
   */
  public async initializeAvatar(user: User): Promise<void> {
    const userAvatar: UserAvatar = new UserAvatar();
    user.avatar = await this.userAvatarRepository.save(userAvatar);
    await this.userRepository.save(user);
    return;
  }

  /**
   * Initialize User Notifications
   *
   * @param user
   * @returns
   */
  public async initializeNotificationSetting(user: User): Promise<void> {
    const userNotificationSetting: UserNotificationSetting =
      new UserNotificationSetting();
    user.notificationSetting =
      await this.userNotificationSettingRepository.save(
        userNotificationSetting,
      );
    await this.userRepository.save(user);
    return;
  }

  /**
   * Get affiliates of user by referral code 
   *
   * @param user
   * @returns
   */
  async getUserReferrals(user: User): Promise<User[]> {
    const sql = ` SELECT u."nickName",u."createdAt"
                FROM
                  users u
                WHERE
                  u."referredBy" = $1;`;
    return await this.userRepository.query(sql, [user.referralCode]);
  }

  /**
   * Get User Transaction History
   *
   * @param user
   * @param queryOption: TransactionFilterDto
   * @returns transactions
   */
  public async getUserTransaction(
    user: User,
    queryOption: TransactionFilterDto,
  ) {
    let paymentQuery = `
    SELECT 
    pay."uuid" AS "id", 
    pay."type" AS "type", 
    pay."amount" AS "amount", 
    (
      SELECT 
        s."question" 
      FROM 
        surveys s 
      WHERE 
        s."uuid" = pay."surveyId"
    ) AS "surveyTitle", 
    case when pay."type" = '${PaymentType.PURCHASE}' then  json_agg(json_build_object('name',ai."item_name")) else null  end as  "itemName",
    pay."walletId" AS "walletId", 
    pay."transactionType" AS "transactionType", 
    pay."createdAt" AS "createdAt" 
    FROM 
    payments pay 
    LEFT JOIN orders o ON o."uuid" = pay."orderId" 
    LEFT JOIN orders_items oi ON oi."orderId" = o."uuid" 
    LEFT JOIN avatars_items ai ON ai."uuid" = oi."itemId" 
    GROUP BY 
    pay."uuid"`;

    let rewardQuery = `
    SELECT 
    r."uuid" AS "id", 
    r."type" AS "type", 
    r."amount" AS "amount", 
    r."survey" AS "surveyTitle", 
    NULL as "itemName", 
    r."walletId" AS "walletId", 
    r."transactionType" AS "transactionType", 
    r."createdAt" AS "createdAt" 
    FROM 
    rewards r`;

    let walletRechargeQuery = `
    SELECT 
    wr."uuid" AS "id", 
    wr."type" AS "type", 
    wr."amountInSom" AS "amount", 
    NULL AS "surveyTitle", 
    NULL AS "productName", 
    wr."walletId" AS "walletId", 
    wr."transactionType" AS "transactionType", 
    wr."createdAt" AS "createdAt" 
    FROM 
    wallet_recharges wr`;

    const format: ITransactionFilters = {
      allTransaction:
        queryOption.type === TransactionEnum.ALL
          ? `${paymentQuery}
        UNION ALL 
      ${rewardQuery}
        UNION ALL 
     ${walletRechargeQuery}`
          : '',
      inTransaction:
        queryOption.type === TransactionEnum.IN
          ? `${rewardQuery}
        UNION ALL 
        ${walletRechargeQuery}`
          : '',
      outTransaction:
        queryOption.type === TransactionEnum.OUT ? `${paymentQuery}` : '',
    };
    const filter = Object.values(format).join('');
    const sql = `SELECT * FROM 
    (
      ${filter}
     ) AS  X WHERE "walletId"=$1
      ORDER BY "createdAt" DESC
    `;
    const transactions = await getConnection().query(sql, [user.wallet.uuid]);
    return transactions;
  }

  /**
   * Update User Fcm Token
   *
   * @param user
   * @param token
   * @returns
   */
  public async updateFcmToken(user, token) {
    const usersessioninfo: UserSessionInfo = user.sessionInfo;
    usersessioninfo.fcmToken = token;
    await this.userSessionInfoRepository.save(usersessioninfo);
    return;
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Notifications
  /*
  /********************************************************************************************************************/

  /**
   * Update User Notification Settings
   *
   * @param payload: NotificationSettingDto
   * @param user: User
   */
  public async updateUserNotificationSetting(
    payload: NotificationSettingDto,
    user: User,
  ) {
    if (payload.all) {
      Object.keys(payload).forEach((v) => (payload[v] = true));
    }
    await this.userNotificationSettingRepository.update(
      user.notificationSetting.uuid,
      payload,
    );
  }

  /**
   * get Unread User Notification Count
   *
   * @param userId
   *@return Notification count
   */

  public async getUnreadUserNotificationCount(userId: string): Promise<number> {
    return await this.cacheManagerService.getUnreadUserNotificationCount(
      userId,
    );
  }

  /**
   * get User Notification
   *
   * @param user
   * @param paginationOption : IPaginationOptions
   * @returns notifications
   */
  public async getUserNotification(
    paginationOption: IPaginationOptions,
    user: User,
  ): Promise<any> {
    const notifications = await this.paginate(paginationOption, {
      user,
    });
    await this.cacheManagerService.deleteUserUnreadNotificationCount(user.uuid);
    return {
      notifications,
    };
  }

  /** Delete User Notification
   *
   * @CurrentUser user
   * @returns
   */
  public async deleteUserNotificationHistory(user: User) {
    try {
      await this.cacheManagerService.deleteUserUnreadNotificationCount(
        user.uuid,
      );
      await this.userNotificationRepository.delete({ user });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   USER ITEM COLLECTION
  /*
  /********************************************************************************************************************/
  /** save User Item Collection
   *
   * @param items: AvatarItem[],
   * @param user: User,
   * @param  queryRunner: QueryRunner
   * @returns
   */
  public async saveItemCollection(
    items: AvatarItem[],
    user: User,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const itemCollections: UserItemCollection[] = [];
        for (const item of items) {
          const itemCollection = new UserItemCollection().fromDto(item, user);
          itemCollections.push(itemCollection);
        }
        await queryRunner.manager.save(itemCollections);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * get User items which are not Purchased by user
   * @param items [uuid]
   * @param user
   * @returns items
   */
  public async getUserNotPurchedItems(itemIds: string[], user: User) {
    const avatarItemId = '\'' + itemIds.join('\',\'') + '\'';
    const sql = `
        SELECT 
          ai."uuid",
          ai."item_name",
          ai."category",
          ai.gender,
          ai."price",
          ai."color",
          ai."status",
          ai."createdAt" 
        FROM 
          avatars_items as ai
        WHERE 
          ai."uuid" NOT IN (
            SELECT 
              uc."itemId" 
            From 
              users_items_collections as uc
            WHERE
              uc."userId"='${user.uuid}' 
					  )
			    AND 
          ai."uuid" IN (${avatarItemId}) `;

    const items = await getConnection().query(sql);
    if (!items.length)
      throw new HttpException(
        {
          statusCode: ResponseCode.ITEMS_ALREADY_PURCHASED,
          message: ResponseMessage.ITEMS_ALREADY_PURCHASED,
        },
        ResponseCode.BAD_REQUEST,
      );
    return items;
  }

  /**
   * Get User Purchased Item Collection
   *
   * @param user
   * @returns resObj
   */
  public async getUserItemCollection(user: User) {
    const resObj = {};
    const sql = `
    SELECT
        item."item_name",
        array_agg(item."color") "colors"
    FROM 
        users_items_collections uic
    INNER JOIN 
    avatars_items item ON item."uuid" = uic."itemId"
    WHERE 
      uic."userId" = '${user.uuid}'
      AND item."status"='${AvatarStatusEnum.ACTIVE}'
    GROUP BY item."item_name";`;
    const userItemCollection = await this.userItemCollectionRepository.query(
      sql,
    );
    if (userItemCollection.length) {
      userItemCollection.map(
        (item: { item_name: string; colors: Array<string> }) => {
          resObj[`${item.item_name}`] = item.colors;
        },
      );
    }
    for (const item_name in AvatarItemNameEnum) {
      if (!resObj[AvatarItemNameEnum[item_name]]) {
        resObj[AvatarItemNameEnum[item_name]] = [];
      }
    }
    return resObj;
  }

  /**
   * Get User Respect Level on Base of Points
   *
   * @param user
   * @returns user.respectLevelPoints
   */
  public getUserRespectLevel(user: User): number {
    if (
      user.respectLevelPoints >= RespectLevelPoints.ZERO &&
      user.respectLevelPoints <= RespectLevelPoints.FIFTY_ONE
    ) {
      return RespectLevel.ONE;
    } else if (
      user.respectLevelPoints >= RespectLevelPoints.FIFTY_ONE &&
      user.respectLevelPoints <= RespectLevelPoints.ONE_FIFTY
    ) {
      return RespectLevel.TWO;
    } else if (
      user.respectLevelPoints >= RespectLevelPoints.ONE_FIFTY_ONE &&
      user.respectLevelPoints <= RespectLevelPoints.THREE_HUNDRED
    ) {
      return RespectLevel.THREE;
    } else if (
      user.respectLevelPoints >= RespectLevelPoints.THREE_HUNDRED_ONE &&
      user.respectLevelPoints <= RespectLevelPoints.FOUR_SEVENTY_FIVE
    ) {
      return RespectLevel.FOUR;
    } else if (
      user.respectLevelPoints >= RespectLevelPoints.FOUR_SEVENTY_SIX &&
      user.respectLevelPoints <= RespectLevelPoints.SEVEN_HUNDRED
    ) {
      return RespectLevel.FIVE;
    } else if (
      user.respectLevelPoints >= RespectLevelPoints.SEVEN_HUNDRED_ONE &&
      user.respectLevelPoints <= RespectLevelPoints.NINE_FIFTY
    ) {
      return RespectLevel.SIX;
    } else {
      return RespectLevel.SEVEN;
    }
  }

  /**
   * Paginate Notification 
   *
   * @param options
   * @param condition
   * @param relations
   * @returns notifications
   */
  private async paginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<UserNotification>> {
    return paginate<UserNotification>(
      this.userNotificationRepository,
      options,
      {
        order: { createdAt: 'DESC' },
        where: condition,
        relations,
      },
    );
  }
}
