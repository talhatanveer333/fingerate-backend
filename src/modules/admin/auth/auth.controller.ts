import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, LoginPayload, RegisterPayload } from './';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { Admin } from '../admin';
import { LoggerService } from '../../../utils/logger/logger.service';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { Request, Response } from 'express';
import { EmailDto, ForgotPasswordDto } from './register.dto';
import { ConfirmationPayload } from './confirmation.dto';
import {
  ToggleTwoFactorPayload,
  TwoFactorPayload,
  ConfrimEmailPayload,
} from './commons/auth.dtos';
import { AdminEmailDto } from '../admin/commons/admin.dtos';

@Controller('api/admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AuthController');
  }

  // @Post('send_email')
  // async sendEmail(
  //   @Body() payload: RegisterPayload,
  //   @Res() res: Response,
  // ): Promise<Response> {
  //   this.loggerService.log(
  //     `POST admin/auth/send_email ${LoggerMessages.API_CALLED}`,
  //   );
  //   await this.authService.sendEmail(payload);
  //   return res.status(ResponseCode.SUCCESS).send({
  //     statusCode: ResponseCode.SUCCESS,
  //     message: ResponseMessage.SUCCESS,
  //   });
  // }

  @Get('confirm_email')
  async confirmEmail(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/auth/confirm_email ${LoggerMessages.API_CALLED}`,
    );
    const token = req.headers.authorization?.split(' ')?.[1];
    await this.authService.confirmEmail(token);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.EMAIL_CONFIRMED,
    });
  }

  @Patch('set_password')
  async setPassword(
    @Body() payload: ConfirmationPayload,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `PATCH admin/auth/set_password ${LoggerMessages.API_CALLED}`,
    );
    const authToken = req.headers.authorization?.split(' ')?.[1];
    const token = await this.authService.setPassword(authToken, payload);
    return res.status(ResponseCode.SUCCESS).send({
      data: token,
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('get_totp_uri')
  async getTotpURI(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/auth/get_totp_uri ${LoggerMessages.API_CALLED}`,
    );
    const token = req.headers.authorization?.split(' ')?.[1];
    const totpURI = await this.authService.generateToTpURI(token);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: totpURI,
    });
  }

  @Post('verify_2fa')
  async verify2FA(
    @Body() payload: TwoFactorPayload,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `POST admin/auth/verify_2fa ${LoggerMessages.API_CALLED}`,
    );
    const token = req.headers.authorization?.split(' ')?.[1];
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].toString() : req.ip       
    const data = await this.authService.verify2FA(
      token,
      payload,
      req.headers['user-agent'],
      ipAddress,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @UseGuards(AuthGuard('admin_jwt'))
  @Post('toggle_2fa')
  async toggle2FA(
    @Body() payload: ToggleTwoFactorPayload,
    @CurrentUser() admin: Admin,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST admin/auth/toggle_2fa ${LoggerMessages.API_CALLED}`,
    );
    const result = await this.authService.toggle2FA(admin, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: result,
    });
  }

  @Post('login')
  async login(
    @Body() payload: LoginPayload,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST admin/auth/login ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.authService.login(payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Post('forgot_password')
  async forgotPassword(
    @Body() payload: EmailDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST admin/auth/forgot_password ${LoggerMessages.API_CALLED}`,
    );
    await this.authService.forgotPassword(payload.email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.FORGOT_PASSWORD_EMAIL,
    });
  }

  @Get('verify_token')
  async checkPasswordLinkExpiry(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/auth/verify_token ${LoggerMessages.API_CALLED}`,
    );
    const token = req.headers.authorization.split(' ')[1];
    await this.authService.checkPasswordLinkExpiry(token);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('confirm_forgot_password')
  async forgotConfirmPassword(
    @Res() res: Response,
    @Req() req: Request,
    @Body() payload: ForgotPasswordDto,
  ): Promise<Response> {
    this.loggerService.log(
      `POST admin/auth/confirm_forgot_password ${LoggerMessages.API_CALLED}`,
    );
    const token = req.headers.authorization.split(' ')[1];
    await this.authService.confirmForgotPassword(token, payload.password);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @UseGuards(AuthGuard())
  @Get('me')
  async getLoggedInUser(@CurrentUser() admin: Admin): Promise<Admin> {
    return admin;
  }

  @Post('invite_admin')
  @UseGuards(AuthGuard('admin_jwt'))
  public async addAdmin(@Body() payload: AdminEmailDto, @Res() res: Response) {
    this.loggerService.log(
      `POST admin/auth/invite_admin ${LoggerMessages.API_CALLED}`,
    );
    const token = await this.authService.sendEmail(payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: process.env.NODE_ENV === 'test' ? token : null,
    });
  }
}
