import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { MailService } from '../../../utils/mailer/mail.service';
import { RegisterPayload } from '.';
import { Hash } from '../../../utils/Hash';
import { Admin, AdminService } from '../admin';
import { LoginPayload } from './login.dto';
import { ConfirmationPayload } from './confirmation.dto';
import { generateKey, generateTotpUri, verifyToken } from 'authenticator';
import { ToggleTwoFactorPayload, TwoFactorPayload } from './commons/auth.dtos';
import moment from 'moment';
import { IpAddress } from 'aws-sdk/clients/cloudhsm';
import {
  ADMIN_AUTH_TOKEN_EXPIRES,
  ADMIN_AUTH_TOKEN_TYPES,
} from './commons/auth.enums';
import { CacheManagerService } from '../../cache-manager/cache-manager.service';
import { PREFIXES } from '../../cache-manager/commons/cache-manager.enums';
import DeviceDetector = require('device-detector-js');
import { LoggerService } from '../../../utils/logger/logger.service';
import { AccountStatus } from '../admin/commons/admin.enum';

@Injectable()
export class AuthService {
  private readonly deviceDetector = new DeviceDetector();
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheManagerService,
    private readonly adminService: AdminService,
    private readonly mailerservice: MailService,
    private readonly loggerService: LoggerService,
  ) {}

  public async adminCreation() {
    try {
      if (process.env.GENESIS_ADMIN_EMAIL) {
        const adminCount = await this.adminService.isAdminExist();
        if (!adminCount) {
          const adminObj = {
            email: process.env.GENESIS_ADMIN_EMAIL,
          };
          await this.sendEmail(adminObj);
        }
      }
      return;
    } catch (err) {
      this.loggerService.error(ResponseMessage.ADMIN_CREATION_ERROR);
    }
  }

  /**
   * It saves the admin(if not exists already) without the password
   *
   * @param payload
   * @returns the access token using "email" and "uuid"
   */
  async sendEmail(payload: RegisterPayload) {
    let admin: Admin = await this.adminService.getByEmail(payload.email);
    if (!admin) admin = await this.adminService.createAdmin(payload);
    if (admin.emailConfirmed)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_ALREADY_EXISTS,
          message: ResponseMessage.USER_ALREADY_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    const { accessToken } = this.createToken(
      admin,
      ADMIN_AUTH_TOKEN_TYPES.INVITE_EMAIL,
      ADMIN_AUTH_TOKEN_EXPIRES.INVITE_EMAIL,
    );
    await this.cacheService.setToken(
      payload.email,
      accessToken,
      PREFIXES.ADMIN_INVITE_TOKEN,
    );
    await this.mailerservice.sendAdminEmailConfirmation(admin, accessToken);
    return { accessToken };
  }

  /**
   * It saves the admin logs of login
   *
   * @param headers
   * @param ip
   * @param id
   * @returns
   */
  async saveLogs(headers: string, ip: IpAddress, id: string) {
    const result = this.deviceDetector.parse(headers);
    const userLog = {
      browser: result.client.name,
      ip: ip,
      id,
      activity_log: moment().unix(),
    };
    return await this.adminService.saveUserLog(userLog);
  }

  /**
   * validate token and return payload for invite and forgot password
   */
  public async validateConfirmationToken(
    token: string,
    tokenType: string,
    cachePrefix = PREFIXES.ADMIN_INVITE_TOKEN,
    checkUserActive = true,
  ): Promise<Admin> {
    let payload: { email: string; uuid: string };
    try {
      payload = this.verifyToken(token, tokenType);
    } catch (err) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_TOKEN,
          message: ResponseMessage.INVALID_TOKEN,
        },
        ResponseCode.BAD_REQUEST,
      );
    }

    const savedToken = await this.cacheService.getToken(
      payload.email,
      cachePrefix,
    );

    if (savedToken !== token) {
      throw new HttpException(
        {
          statusCode: ResponseCode.TOKEN_EXPIRED,
          message: ResponseMessage.TOKEN_EXPIRED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }

    const admin = await this.adminService.getByEmail(payload.email);
    if (!admin)
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );
    if (admin.emailConfirmed && checkUserActive)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_ALREADY_EXISTS,
          message: ResponseMessage.USER_ALREADY_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    return admin;
  }

  /**
   * Confirm User Email
   *
   * @returns
   * @param token
   */
  public async confirmEmail(token: string) {
    await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.INVITE_EMAIL,
    );
  }

  /**
   * it saves/changes the password of existing user
   *
   * @param token
   * @param payload
   * @returns the twoFA key
   */
  async setPassword(token: string, payload: ConfirmationPayload) {
    const admin = await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.INVITE_EMAIL,
    );
    await this.adminService.setPassword(admin, payload.password);
    await this.cacheService.delToken(admin.email, PREFIXES.ADMIN_INVITE_TOKEN);
    const { accessToken } = this.createToken(
      admin,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_AUTH_2FA,
      ADMIN_AUTH_TOKEN_EXPIRES.ADMIN_AUTH_2FA,
    );
    await this.cacheService.setToken(
      admin.email,
      accessToken,
      PREFIXES.ADMIN_2FA_TOKEN,
    );

    return { token: accessToken };
  }

  /**
   *
   * @param payload
   * @returns
   */
  async login(payload: LoginPayload) {
    const admin = await this.validateUser(payload);
    const { accessToken } = this.createToken(
      admin,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_AUTH_2FA,
      ADMIN_AUTH_TOKEN_EXPIRES.ADMIN_AUTH_2FA,
    );
    await this.cacheService.setToken(
      admin.email,
      accessToken,
      PREFIXES.ADMIN_2FA_TOKEN,
    );

    if (!admin.twoFa) {
      throw new HttpException(
        {
          statusCode: ResponseCode.TWOFA_NOT_CONFIGURED,
          message: ResponseMessage.TWOFA_NOT_CONFIGURED,
          data: { token: accessToken },
        },
        ResponseCode.BAD_REQUEST,
      );
    }

    return { token: accessToken };
  }

  /**
   *
   * @param token
   * @param payload
   * @param header
   * @param ip
   * @returns the access token
   */
  async verify2FA(
    token: string,
    payload: TwoFactorPayload,
    header: string,
    ip: IpAddress,
  ): Promise<{ token: string; admin: Admin }> {
    const admin = await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_AUTH_2FA,
      PREFIXES.ADMIN_2FA_TOKEN,
      false,
    );
    if (!admin?.twoFaKey?.length)
      throw new HttpException(
        {
          statusCode: ResponseCode.TWOFA_DISABLED,
          message: ResponseMessage.TWOFACTOR_DISABLED,
        },
        ResponseCode.BAD_REQUEST,
      );

    const verified = await verifyToken(admin.twoFaKey, payload.code);
    if (!verified)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
          message: ResponseMessage.INVALID_2FA_CODE,
        },
        ResponseCode.BAD_REQUEST,
      );

    if (!admin.twoFa) await this.adminService.toggle2FA(admin);

    const { accessToken } = this.createToken(admin);

    await this.saveLogs(header, ip, admin.uuid);
    await this.cacheService.delToken(admin.email, PREFIXES.ADMIN_2FA_TOKEN);
    return { token: accessToken, admin };
  }

  async toggle2FA(admin: Admin, payload: ToggleTwoFactorPayload) {
    if (!admin)
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );

    const verified = await verifyToken(admin.twoFaKey, payload.code);
    if (!verified)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
          message: ResponseMessage.INVALID_2FA_CODE,
        },
        ResponseCode.BAD_REQUEST,
      );

    return await this.adminService.toggle2FA(admin);
  }

  createToken(
    admin: Admin,
    tokenType = ADMIN_AUTH_TOKEN_TYPES.LOGIN,
    expiryTime?: number | string,
    subject?: string,
  ) {
    return {
      expiresIn: process.env.JWT_EXPIRATION_TIME,
      accessToken: this.jwtService.sign(
        { uuid: admin.uuid, email: admin.email, tokenType },
        {
          subject: subject ? process.env.JWT_SECRET_KEY + subject : '',
          expiresIn: expiryTime ? expiryTime : process.env.JWT_EXPIRATION_TIME,
        },
      ),
      admin,
    };
  }

  verifyToken(
    token: string,
    tokenType?: string,
  ): { uuid: string; email: string } {
    const jwtPayload = this.jwtService.verify(token);

    if (jwtPayload.tokenType !== tokenType)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_TOKEN,
          message: ResponseMessage.INVALID_TOKEN,
        },
        ResponseCode.BAD_REQUEST,
      );

    return jwtPayload;
  }

  async validateUser(payload: LoginPayload): Promise<Admin> {
    const admin = await this.adminService.getByEmail(payload.email);
    if (!admin)
      throw new HttpException(
        {
          statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
          message: ResponseMessage.EMAIL_NOT_REGISTERED,
        },
        ResponseCode.BAD_REQUEST,
      );

    if (admin.status != AccountStatus.ACTIVE)
      throw new HttpException(
        {
          statusCode: ResponseCode.INACTIVE_ACCOUNT,
          message: ResponseMessage.INACTIVE_ACCOUNT,
        },
        ResponseCode.BAD_REQUEST,
      );
    const isValidPassword = await Hash.compare(
      payload.password,
      admin.password,
    );
    if (!isValidPassword)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_USERNAME_OR_PASSWORD,
          message: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
        },
        ResponseCode.BAD_REQUEST,
      );

    return admin;
  }

  /**
   * Send Password Recovery Link To User Email
   *
   * @param email
   * @returns
   */
  public async forgotPassword(email: string) {
    const admin = await this.adminService.getByEmail(email);
    if (!admin) return;

    const { accessToken } = this.createToken(
      admin,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_FORGOT_PASSWORD,
      ADMIN_AUTH_TOKEN_EXPIRES.ADMIN_FORGOT_PASSWORD,
    );
    await this.cacheService.setToken(
      email,
      accessToken,
      PREFIXES.ADMIN_FORGOT_PASSWORD,
    );

    try {
      await this.mailerservice.sendForgotPasswordMail(admin.email, accessToken);
    } catch (err) {}
  }

  async checkPasswordLinkExpiry(token: string) {
    await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_FORGOT_PASSWORD,
      PREFIXES.ADMIN_FORGOT_PASSWORD,
      false,
    );
  }

  /**
   * Confirm the forgot password and update
   *
   * @param token
   * @param password
   * @returns
   */
  public async confirmForgotPassword(token: string, password: string) {
    const admin = await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_FORGOT_PASSWORD,
      PREFIXES.ADMIN_FORGOT_PASSWORD,
      false,
    );
    await this.adminService.confirmForgotPassword(admin, password);
    await this.cacheService.delToken(
      admin.email,
      PREFIXES.ADMIN_FORGOT_PASSWORD,
    );
  }

  /**
   *
   * @returns ToTpURI key and corresponding URI
   * @param token
   */
  public async generateToTpURI(token: string) {
    const admin = await this.validateConfirmationToken(
      token,
      ADMIN_AUTH_TOKEN_TYPES.ADMIN_AUTH_2FA,
      PREFIXES.ADMIN_2FA_TOKEN,
      false,
    );
    if (admin.twoFa)
      throw new HttpException(
        {
          statusCode: ResponseCode.TWOFA_ALREADY_ENABLED,
          message: ResponseMessage.TWOFA_ALREADY_ENABLED,
        },
        ResponseCode.BAD_REQUEST,
      );

    const key = admin.twoFaKey ? admin.twoFaKey : generateKey();
    const formattedKey: string = key.replace(/\s/g, '').toUpperCase();
    if (!admin?.twoFaKey) {
      await this.adminService.setToTpURI(admin, formattedKey);
    }

    const toTpURI = generateTotpUri(
      formattedKey,
      admin.email,
      process.env.APP_NAME,
      'SHA1',
      6,
      30,
    );
    return { toTpURI, formattedKey };
  }
}
