import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoginPayload, SocialLoginPayload } from './login.payload';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from '../user';
import { LoggerService } from '../../utils/logger/logger.service';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { Response } from 'express';
import {
  EmailDto,
  verificationCodeDto,
  NickNameDto,
  CreatePasswordDto,
  ReferralCodeDto,
  PhoneNumberDTO,
  PhoneNumberVerifyDTO,
  ConfirmPasswordDto,
} from './common/auth.dtos';
import { RegisterPayload } from './register.payload';
import { AuthEnum } from './common/auth.enums';
import { DeviceGuard } from '../user/common/device-guard';
import { DeviceInfoHeader } from './common/auth.interface';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AuthController');
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    LOGIN
  /*
  /********************************************************************************************************************/

  @UseGuards(DeviceGuard)
  @Post('login')
  async login(
    @Body() payload: LoginPayload,
    @Res() res: Response,
    @Headers() { deviceinfo }: DeviceInfoHeader,
  ): Promise<Response> {
    this.loggerService.log(`POST auth/login ${LoggerMessages.API_CALLED}`);
    const user = await this.authService.validateUser(payload);
    const expiryTime = payload.autoLogin ? AuthEnum.AUTO_LOGIN_EXPIRY : null;
    const token = this.authService.createToken(user, expiryTime);
    await this.authService.updateLoginToken(
      user,
      token.accessToken,
      deviceinfo,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: token.accessToken,
    });
  }

  @UseGuards(DeviceGuard)
  @Post('social_login')
  async socialLogin(
    @Body() payload: SocialLoginPayload,
    @Res() res: Response,
    @Headers() { deviceinfo }: DeviceInfoHeader,
  ): Promise<Response> {
    this.loggerService.log(
      `POST auth/social_login ${LoggerMessages.API_CALLED}`,
    );
    const { user, firstLogin } = await this.authService.userSocialLogin(
      payload,
    );
    const expiryTime = payload.autoLogin ? AuthEnum.AUTO_LOGIN_EXPIRY : null;
    const token = this.authService.createToken(user, expiryTime);
    await this.authService.updateLoginToken(
      user,
      token.accessToken,
      deviceinfo,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: { accessToken: token.accessToken, firstLogin: firstLogin },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(`POST auth/logout ${LoggerMessages.API_CALLED}`);
    await this.authService.logout(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    FORGOT PASSWORD
  /*
  /********************************************************************************************************************/

  @Post('forgot_password')
  async forgotPassword(
    @Body() body: EmailDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET auth/forgot_password ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.forgotPassword(body.email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.FORGOT_PASSWORD_EMAIL,
    });
  }

  @Get('verify_forgot_password_code')
  async checkPasswordCodeExpiry(
    @Query() query: verificationCodeDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET auth/verify_forgot_password_token ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.verifyForgotPasswordCode(query.email, query.code);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('confirm_forgot_password')
  async forgotConfirmPassword(
    @Res() res: Response,
    @Body() payload: ConfirmPasswordDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET auth/confirm_forgot_password ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.confirmForgotPassword(
      payload.email,
      payload.code,
      payload.password,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    SIGN UP
  /*
  /********************************************************************************************************************/

  @Post('email_verification_code')
  async emailVerificationCode(
    @Body() body: EmailDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST auth/email_verification_code ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.emailVerificationCode(body.email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('verify_email_code')
  async verifyEmailCode(
    @Body() body: verificationCodeDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST auth/verify_email_code ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.verifyEmailCode(body);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @UseGuards(DeviceGuard)
  @Post('create_password')
  async createPassword(
    @Query() query: EmailDto,
    @Body() payload: CreatePasswordDto,
    @Res() res: Response,
    @Headers() { deviceinfo }: DeviceInfoHeader,
  ): Promise<Response> {
    this.loggerService.log(
      `Post auth/create_password ${LoggerMessages.API_CALLED}`,
    );
    const tokenData = await this.authService.createPassword(
      query.email,
      payload.password,
      deviceinfo,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: tokenData.accessToken,
    });
  }

  @Get('check_nick_name')
  async checkNickName(
    @Query() query: NickNameDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Get auth/check_nick_name ${LoggerMessages.API_CALLED}`,
    );
    const data: any = await this.authService.checkNickName(query.nickName);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: data.message,
      available: data.available,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('check_referral_code')
  async checkReferralCode(
    @CurrentUser() user: User,
    @Body() payload: ReferralCodeDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post auth/check_referral_code ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.checkReferralCode(payload.referralCode, user.email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('validate_phone_number')
  async validatePhoneNumber(
    @CurrentUser() user: User,
    @Body() body: PhoneNumberDTO,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST validate_phone_number ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.sendPhoneNumberOtp(body, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('validate_phone_otp')
  async validatePhoneNumberToken(
    @CurrentUser() user: User,
    @Body() body: PhoneNumberVerifyDTO,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST validate_phone_otp ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.verifyPhoneOtp(body, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.CERTIFIED,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    UPDATE USER
  /*
  /********************************************************************************************************************/

  @UseGuards(AuthGuard('jwt'))
  @Patch('update_user_info')
  async updateUserInfo(
    @CurrentUser() user: User,
    @Body() payload: RegisterPayload,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `PATCH auth/update_user_info ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.updateUserInfo(payload, user.email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    CURRENT USER
  /*
  /********************************************************************************************************************/

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getLoggedInUser(@CurrentUser() user: User): User {
    return user;
  }
}
