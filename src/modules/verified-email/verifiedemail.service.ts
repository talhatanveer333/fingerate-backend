import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../modules/user/user.entity';
import { Repository } from 'typeorm';
import { VerifiedEmail } from './verifiedemail.entity';
import speakeasy from 'speakeasy';
import { MailService } from '../../utils/mailer/mail.service';
import { ResponseCode, ResponseMessage } from '../../utils/enum';

@Injectable()
export class VerifiedEmailService {
  constructor(
    private readonly mailerservice: MailService,
    @InjectRepository(VerifiedEmail)
    private readonly repo: Repository<VerifiedEmail>,
  ) {}

  /** find One Verify Email
   *
   * @param options
   * @returns email
   */
  public async findOne(options) {
    return await this.repo.findOne(options);
  }
  /**
   * Save email to Verify Email 
   *    
   * @param email: string
   * @param  otp?: null | string
   * @returns verifiedEmail
   */
  public async saveVerifiedEmail(
    email: string,
    otp?: null | string,
    verified = false,
  ): Promise<VerifiedEmail> {
    const verifiedEmail = new VerifiedEmail();
    verifiedEmail.email = email;
    verifiedEmail.verified = verified;
    verifiedEmail.otp = otp;
    await this.repo.save(verifiedEmail);
    return verifiedEmail;
  }

  /**
   * Verify email and send verification code to verify email 
   *
   * @param user
   * @param email
   * @returns verified , emailSent
   */
  async addVerifiedEmail(user: User, email: string) {
    try {
      const isEmail = await this.repo.findOne({
        email,
      });
      if (isEmail && isEmail.verified) {
        return { verified: true, emailSent: false };
      }
      const token = speakeasy.totp({
        secret: process.env.OTP_KEY,
        digits: 6,
      });

      if (isEmail && !isEmail.verified) {
        await this.mailerservice.sendEmailVerificationCode(
          email,
          token.toString(),
        );
        isEmail.otp = token;
        await this.repo.save(isEmail);
        return { verified: false, emailSent: true };
      }

      if (user.email === email) {
        await this.saveVerifiedEmail(email, null, true);
        return { verified: true, emailSent: false };
      }

      await this.mailerservice.sendEmailVerificationCode(
        email,
        token.toString(),
      );
      await this.saveVerifiedEmail(email, token);
      return { verified: false, emailSent: true };
    } catch (err) {
      throw err;
    }
  }

  /**
   * check verify email and verification code and make verify email to verified
   *
   * @param email
   * @param code
   * @returns
   */
  async verifyEmail(email: string, code: string) {
    try {
      const emailExists = await this.repo.findOne({
        email,
      });
      if (!emailExists) {
        throw new HttpException(
          {
            statusCode: ResponseCode.EMAIL_NOT_REGISTERED,
            message: ResponseMessage.EMAIL_NOT_REGISTERED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (emailExists.otp !== code) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INVALID_VERIFICATION_CODE,
            message: ResponseMessage.INVALID_VERIFICATION_CODE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const verified = speakeasy.totp.verifyDelta({
        secret: process.env.OTP_KEY,
        token: code,
        window: 6,
      });
      if (!verified) {
        throw new HttpException(
          {
            statusCode: ResponseCode.VERIFICATION_CODE_EXPIRED,
            message: ResponseMessage.EMAIL_CODE_EXPIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      emailExists.otp = null;
      emailExists.verified = true;
      return await this.repo.save(emailExists);
    } catch (err) {
      throw err;
    }
  }
}
