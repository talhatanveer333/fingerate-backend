import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { MailService } from '../../utils/mailer/mail.service';
import { RegisterPayload } from './register.payload';
import {
  PhoneNumberDTO,
  PhoneNumberVerifyDTO,
  verificationCodeDto,
} from './common/auth.dtos';
import { Hash } from '../../utils/Hash';
import { User, UsersService } from './../user';
import { LoginPayload, SocialLoginPayload } from './login.payload';
import speakeasy from 'speakeasy';
import { LoginType, UserStatusEnum } from './common/auth.enums';
import { MessageBirdService } from '../../utils/messagebird/messagebird.service';
import { CacheManagerService } from '../cache-manager/cache-manager.service';
import axios from 'axios';
import dayjs from 'dayjs';
import { EXPIRES } from '../cache-manager/commons/cache-manager.enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly messageBirdService: MessageBirdService,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly mailerservice: MailService,
    private readonly cacheManagerService: CacheManagerService,
  ) {}

  /**
   * Generate jwt token for user
   *
   * @param user
   * @param expiryTime
   * @param subject
   * @returns
   */
  createToken(
    user: User,
    expiryTime?: number | string | null,
    subject?: string,
  ) {
    return {
      expiresIn: expiryTime ? expiryTime : process.env.JWT_EXPIRATION_TIME,
      accessToken: this.jwtService.sign(
        { uuid: user?.uuid },
        {
          subject: subject ? subject : '',
          expiresIn: expiryTime ? expiryTime : process.env.JWT_EXPIRATION_TIME,
        },
      ),
      user: user.toDto(),
    };
  }

  /** ******************************************************************************************************************/

  /*
    /*                                    LOGIN
    /*
    /********************************************************************************************************************/

  /**
   * update user jwt token
   *
   * @returns
   * @param user
   * @param loginToken
   * @param deviceInfo
   */
  async updateLoginToken(user: User, loginToken: string, deviceInfo?: string) {
    await this.userService.updateLoginToken(user, loginToken, deviceInfo);
  }

  /**
   * Validate User For Login
   *
   * @param payload
   * @returns user
   */
  async validateUser(payload: LoginPayload): Promise<User> {
    let user: User;
    try {
      if (await this.cacheManagerService.checkIfUserBlocked(payload.email)) {
        throw new HttpException(
          {
            statusCode: ResponseCode.FIVE_LOGIN_ATTEMPT,
            message: ResponseMessage.FIVE_LOGIN_ATTEMPT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      user = await this.userService.getByEmail(payload.email, ['sessionInfo']);
      if (!user) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_USERNAME_OR_PASSWORD,
            message: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      this.userService.checkUserActiveStatus(user);
      if (user.loginType !== LoginType.SYSTEM) {
        throw new HttpException(
          {
            loginType: user.loginType.toUpperCase(),
            statusCode: ResponseCode.INVALID_LOGIN_TYPE,
            message: ResponseMessage.INVALID_LOGIN_TYPE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const isValidPassword = await Hash.compare(
        payload.password,
        user.password,
      );
      if (!isValidPassword) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_USERNAME_OR_PASSWORD,
            message: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.cacheManagerService.deleteFailedLoginAttempts(payload.email);
      await this.checkIfOneMonthIdle(user);
      return user;
    } catch (err) {
      await this.cacheManagerService.updateFailedLoginAttempts(payload.email);
      throw err;
    }
  }
  
  /**
   *  check If user is not login for One Month
   * 
   * @param user: User
   * @return 
   */
  private async checkIfOneMonthIdle(user: User) {
    const lastLoginDifferenceInMonth = dayjs
      .unix(user.sessionInfo.lastLogin)
      .diff(dayjs(), 'months');
    if (lastLoginDifferenceInMonth >= 1) {
      user.respectLevel = this.userService.decrementUserLevel(user);
      user.respectLevelPoints = this.userService.getUserRespectPointsByLevel(
        user.respectLevel,
      );
    }
    await this.userService.save(user);
  }

  /**
   *
   * Login User from social app
   *
   * @param payload
   * @returns user
   */
  async userSocialLogin(
    payload: SocialLoginPayload,
  ): Promise<{ user: User; firstLogin: boolean }> {
    let user: User;
    try {
      const userEmail = await this.getEmailFromToken(payload);
      user = await this.userService.getByEmail(userEmail, ['sessionInfo']);
      let firstLogin = false;
      if (!user) {
        user = new User();
        user.email = userEmail;
        user.loginType = payload.loginType;
        user.isActive = true;
        user.referralCode = speakeasy.generateSecretASCII(10);
        user = await this.userService.save(user);
        user = await this.userService.getByEmail(userEmail, ['sessionInfo']);
        firstLogin = true;
      }
      this.userService.checkUserActiveStatus(user);
      await this.checkIfOneMonthIdle(user);
      if (userEmail?.length)
        await this.cacheManagerService.deleteFailedLoginAttempts(userEmail);
      return { user, firstLogin };
    } catch (err) {
      throw err;
    }
  }

  /**
   * From social app get user email  
   *
   * @param payload
   * @returns userEmail
   */
  public async getEmailFromToken(payload: SocialLoginPayload): Promise<string> {
    let userEmail: string;
    let apiURL: string;
    if (payload.loginType === LoginType.NAVER) {
      apiURL = process.env.NAVER_BASEURL + process.env.NAVER_GET_USER;
    }
    if (payload.loginType === LoginType.KAKAO) {
      apiURL = process.env.KAKAO_BASEURL + process.env.KAKAO_GET_USER;
    }
    const instance = axios.create({
      headers: {
        Authorization: `Bearer ${payload.token}`,
      },
    });
    await instance
      .post(apiURL)
      .then((response) => {
        if (payload.loginType === LoginType.NAVER) {
          userEmail = response.data.response.email;
        }
        if (payload.loginType === LoginType.KAKAO) {
          userEmail = response.data.kakao_account.email;
        }
      })
      .catch((error) => {
        throw new HttpException(
          {
            statusCode: ResponseCode.UNABLE_TO_SOCIAL_LOGIN,
            message: ResponseMessage.UNABLE_TO_SOCIAL_LOGIN,
          },
          ResponseCode.BAD_REQUEST,
        );
      });
    return userEmail;
  }

  /** ***********************************************************************************************/

  /*  Email Verification Code and Update user Info /*
  *************************************************************************************************/
  /**
   * get User email verification code
   *
   * @returns
   * @param email
   */
  async emailVerificationCode(email: string) {
    let user: User;
    try {
      if (await this.cacheManagerService.checkIfUserBlocked(email)) {
        throw new HttpException(
          {
            statusCode: ResponseCode.FIVE_CONFIRMATION_ATTEMPT,
            message: ResponseMessage.FIVE_CONFIRMATION_ATTEMPT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      user = await this.userService.getByEmail(email);
      if (!user) {
        user = new User();
        user.email = email;
        user.loginType = LoginType.SYSTEM;
        user = await this.userService.save(user);
      }
      // TODO: add a check if user has withdraw for 6 months re-register him
      if (user && user.isActive) {
        throw new HttpException(
          {
            loginType: user.loginType.toUpperCase(),
            statusCode: ResponseCode.USER_ALREADY_EXISTS,
            message: ResponseMessage.USER_ALREADY_EXISTS,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      this.userService.checkUserActiveStatus(user, false);
      const token = await this.cacheManagerService.setOTP(email);
      await this.mailerservice.sendEmailVerificationCode(email, token);
      await this.updateUserOTPRetries(user);
      return token;
    } catch (err) {
      await this.updateUserOTPRetries(user);
      throw err;
    }
  }

  /**
   *  Update user retries for sign up or forgot password
   * 
   * @param user: User
   * @param key?: string
   * @return 
   */
  async updateUserOTPRetries(user: User, key?: string) {
    if (!key) key = user.email;

    if (user?.status === UserStatusEnum.ACTIVE) {
      const blockCount = await this.cacheManagerService.updateEmailOTPAttempts(
        key,
      );
      if (blockCount >= 3) {
        user.status = UserStatusEnum.DISABLED;
        await this.userService.save(user);
        await this.userService.addUserStatusHistory(
          user,
          UserStatusEnum.DISABLED,
          'user retries for sign up or forgot password',
        );
        await this.cacheManagerService.deleteFailedBlockCount(key);
        throw new HttpException(
          {
            statusCode: ResponseCode.TEMPORARY_BLOCK,
            message: ResponseMessage.TEMPORARY_BLOCK,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Verify User Email verification code
   *
   * @param payload
   * @returns
   */
  // TODO: OTP verification needs to be blocked as well if multiple wrong attempts
  async verifyEmailCode(payload: verificationCodeDto) {
    try {
      const user = await this.userService.getByEmail(payload.email);
      if (!user) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
            message: ResponseMessage.EMAIL_NOT_REGISTERED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      this.userService.checkUserActiveStatus(user, false);
      const otp = await this.cacheManagerService.getOTP(payload.email);
      if (!otp?.length) {
        throw new HttpException(
          {
            statusCode: ResponseCode.VERIFICATION_CODE_EXPIRED,
            message: ResponseMessage.EMAIL_CODE_EXPIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (otp !== payload.code) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
            message: ResponseMessage.INVALID_VERIFICATION_CODE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      user.isActive = true;
      user.referralCode = speakeasy.generateSecretASCII(10);
      await this.cacheManagerService.deleteEmailOTPAttempts(user.email);
      return await this.userService.save(user);
    } catch (err) {
      throw err;
    }
  }

  /**
   * update User Info from signup and get user
   *
   * @body payload
   * @param email
   * @returns
   */
  public async updateUserInfo(payload: RegisterPayload, email: string) {
    if (payload.age >= dayjs().get('year')) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_INPUT,
          message: ResponseMessage.INVALID_AGE,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const user = await this.userService.getByEmail(email, [
      'wallet',
      'respectPolicy',
    ]);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (!user.isActive) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_VERIFIED,
          message: ResponseMessage.EMAIL_NOT_VERIFIED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (payload.nickName) {
      const { available } = await this.userService.checkNickName(
        payload.nickName,
      );
      if (!available) {
        throw new HttpException(
          {
            statusCode: ResponseCode.BAD_REQUEST,
            message: ResponseMessage.NICKNAME_ALREADY_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.userService.updateUserInfo(user, payload);
      if (user.respectPolicy?.infoReward === false) {
        await this.userService.initGiveInfoReward(user);
      }
    }
    if (payload.avatar) {
      try {
        if (!!JSON.parse(payload.avatar)) {
          await this.userService.updateUserAvatar(user, payload.avatar);
          await this.userService.updateUserProfileImage(user, payload.avatar);
        }
      } catch (err) {
        throw new HttpException(
          {
            statusCode: ResponseCode.BAD_REQUEST,
            message: ResponseMessage.AVATAR_INPUT_NOT_CONSISTENT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
    }
    return user;
  }

  /** ******************************************************************************************************************/

  /*
    /*                                    FORGOT PASSWORD
    /*
    /********************************************************************************************************************/

  /**
   * Send Password Recovery Link To User Email
   *
   * @param email
   * @returns
   */
  public async forgotPassword(email: string): Promise<void> {
    let user: User;
    try {
      if (await this.cacheManagerService.checkIfUserBlocked(email)) {
        await this.cacheManagerService.deleteOTP(email);
        throw new HttpException(
          {
            statusCode: ResponseCode.FIVE_CONFIRMATION_ATTEMPT,
            message: ResponseMessage.FIVE_CONFIRMATION_ATTEMPT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      user = await this.userService.getByEmail(email);
      if (!user) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
            message: ResponseMessage.EMAIL_NOT_REGISTERED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }

      this.userService.checkUserActiveStatus(user);
      const token = await this.cacheManagerService.setOTP(
        email,
        EXPIRES.FORGOT_OTP,
      );
      await this.updateUserOTPRetries(user);
      await this.mailerservice.sendForgotPasswordMail(user.email, token);
      return;
    } catch (err) {
      if (user) await this.updateUserOTPRetries(user);
      throw err;
    }
  }

  /**
   * Common function for verify and confirm password API to check user and code validations
   *
   * @param email
   * @param code
   * @returns
   */
  async checkUserAndOTPForgotPassword(
    email: string,
    code: string,
  ): Promise<User> {
    const user = await this.userService.getByEmail(email, ['sessionInfo']);
    const otp = await this.cacheManagerService.getOTP(email);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (
      (await this.cacheManagerService.checkIfUserBlocked(email)) &&
      !otp?.length
    ) {
      throw new HttpException(
        {
          statusCode: ResponseCode.FIVE_CONFIRMATION_ATTEMPT,
          message: ResponseMessage.FIVE_CONFIRMATION_ATTEMPT,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    this.userService.checkUserActiveStatus(user);
    if (!otp?.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.VERIFICATION_CODE_EXPIRED,
          message: ResponseMessage.RESET_PASSWORD_CODE_EXPIRED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (otp !== code) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
          message: ResponseMessage.INVALID_VERIFICATION_CODE,
        },
        ResponseCode.BAD_REQUEST,
      );
    }

    return user;
  }

  /**
   * Check whether the Password Recovery Link Has Expired Or Not
   *
   * @param email
   * @param code
   * @returns
   */
  // TODO: OTP verification needs to be blocked as well if multiple wrong attempts
  async verifyForgotPasswordCode(email: string, code: string) {
    await this.checkUserAndOTPForgotPassword(email, code);
  }

  /**
   * Confirm password verification code and save password 
   *
   * @param email
   * @param code
   * @param password
   * @returns
   */
  public async confirmForgotPassword(
    email: string,
    code: string,
    password: string,
  ): Promise<void> {
    const user = await this.checkUserAndOTPForgotPassword(email, code);
    await this.userService.confirmForgotPassword(user.email, password);
    await this.cacheManagerService.deleteEmailOTPAttempts(user.email);
  }

  /**
   * Create User Password and get updated jwt token
   *
   * @param email
   * @param password
   * @param deviceInfo
   * @returns
   */
  async createPassword(email: string, password: string, deviceInfo?: string) {
    const user = await this.userService.getByEmail(email, ['sessionInfo']);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (!user.isActive) {
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_VERIFIED,
          message: ResponseMessage.EMAIL_NOT_VERIFIED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (user.password) {
      throw new HttpException(
        {
          statusCode: ResponseCode.PASSWORD_ALREADY_CREATED,
          message: ResponseMessage.PASSWORD_ALREADY_CREATED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    await this.userService.createPassword(email, password);
    const token = this.createToken(user);
    await this.userService.updateLoginToken(
      user,
      token.accessToken,
      deviceInfo,
    );
    return token;
  }

  /**
   * Check whether nickname available or not for user
   *
   * @param nickName
   * @returns
   */
  async checkNickName(
    nickName: string,
  ): Promise<{ message: string; available: boolean }> {
    return await this.userService.checkNickName(nickName);
  }

  /**
   * Expire User Token On Logout
   *
   * @returns
   */
  async logout(user: User) {
    return await this.userService.updateLoginToken(user, '');
  }

  /**
   * Check whether the referral code exits or not 
   *
   * @param referralCode
   * @param email
   * @returns
   */
  async checkReferralCode(referralCode: string, email: string): Promise<void> {
    const user = await this.userService.getByEmail(email);
    try {
      if (!user) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
            message: ResponseMessage.EMAIL_NOT_REGISTERED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (!user.isActive) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_VERIFIED,
            message: ResponseMessage.EMAIL_NOT_VERIFIED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (user.referralCode === referralCode) {
        throw new HttpException(
          {
            statusCode: ResponseCode.SELF_REFERRENCING,
            message: ResponseMessage.SELF_REFERRENCING,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.userService.checkReferralCode(referralCode, email);
      return;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Send OTP to User Phone Number 
   *
   * @param body
   * @param user
   * @returns
   */
  public async sendPhoneNumberOtp(body: PhoneNumberDTO, user: User) {
    try {
      if (user.phoneNumber === body.phoneNumber) {
        throw new HttpException(
          {
            statusCode: ResponseCode.PHONE_NUMBER_VERIFIED,
            message: ResponseMessage.PHONE_NUMBER_VERIFIED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (await this.cacheManagerService.checkIfUserBlocked(body.phoneNumber)) {
        await this.cacheManagerService.deleteOTP(body.phoneNumber);
        throw new HttpException(
          {
            statusCode: ResponseCode.FIVE_CONFIRMATION_ATTEMPT,
            message: ResponseMessage.FIVE_CONFIRMATION_ATTEMPT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      this.userService.checkUserActiveStatus(user);
      const phoneInUse = await this.userService.checkPhoneNumberExists(
        body.phoneNumber,
      );

      if (phoneInUse) {
        throw new HttpException(
          {
            statusCode: ResponseCode.PHONE_NUMBER_ALREADY_ESXISTS,
            message: ResponseMessage.PHONE_NUMBER_ALREADY_IN_USE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }

      const token = await this.cacheManagerService.setOTP(body.phoneNumber);

      await this.messageBirdService.messageCreate(body.phoneNumber, token);
      await this.updateUserOTPRetries(user, body.phoneNumber);
    } catch (e) {
      if (user.phoneNumber !== body.phoneNumber)
        await this.updateUserOTPRetries(user, body.phoneNumber);
      throw e;
    }
  }

  /**
   * Verify user phone number OTP  
   *
   * @param body
   * @param user
   * @returns
   */
  public async verifyPhoneOtp(
    body: PhoneNumberVerifyDTO,
    user: User,
  ): Promise<void> {
    try {
      const otp = await this.cacheManagerService.getOTP(body.phoneNumber);
      if (
        (await this.cacheManagerService.checkIfUserBlocked(body.phoneNumber)) &&
        !otp?.length
      ) {
        throw new HttpException(
          {
            statusCode: ResponseCode.FIVE_CONFIRMATION_ATTEMPT,
            message: ResponseMessage.FIVE_CONFIRMATION_ATTEMPT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (!otp?.length) {
        throw new HttpException(
          {
            statusCode: ResponseCode.VERIFICATION_CODE_EXPIRED,
            message: ResponseMessage.RESET_PASSWORD_CODE_EXPIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (otp !== body.token) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
            message: ResponseMessage.INVALID_VERIFICATION_CODE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }

      await this.userService.updatePhoneNumber(user.email, body);
      await this.cacheManagerService.deleteEmailOTPAttempts(body.phoneNumber);
    } catch (e) {
      throw e;
    }
  }
}
