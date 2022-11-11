import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, HttpException } from '@nestjs/common';
import { Survey } from '../../modules/survey/survey.entity';
import { Admin } from '../../modules/admin/admin';
import { ResponseCode, ResponseMessage } from '../../utils/enum';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  /**
   *Send Emai To Survey Initiator
   *
   * @param survey
   * @returns
   */
  public async sendSurveyResult(survey: Survey): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await this.mailerService.sendMail({
          to: survey.email,
          from: process.env.SENDGRID_EMAIL, // override default from
          subject: 'Survey Result Out',
          html: `<h4 style=" font-style: normal;
            font-weight: normal;
            font-size: 1rem;
            line-height: 1.125rem;
            text-align: left;
            color: #000000;
            margin-bottom: 2rem;">
                    Survey Result Out ${survey.question}
                </h4>
           </div>

        </div>

    </div>`,
        });
        resolve();
      } catch (err) {
        reject(
          new HttpException(
            {
              statusCode: ResponseCode.INTERNAL_ERROR,
              message: ResponseMessage.EMAIL_SENDING_ERROR,
            },
            ResponseCode.BAD_REQUEST,
          ),
        );
      }
    });
  }

  /**
   * Send Account Confirmation Email To User On Signup
   *
   * @param user
   * @param token
   */
  public async sendAdminEmailConfirmation(
    user: Admin,
    token: string,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const currentYear = new Date().getFullYear();
      const url = process.env.APP_URL + 'onboarding';
      try {
        await this.mailerService.sendMail({
          to: user.email,
          from: process.env.SENDGRID_EMAIL, // override default from
          subject: 'Welcome to Fingerate! Confirm your Email',
          html: `
            <html lang="en">
<head>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Rubik:400,700&display=swap" rel="stylesheet" type="text/css">
</head>
<body style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);">
<table bgcolor="#710093" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" height="100%" align="center">
<tbody><tr>
<td bgcolor="#710093" style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);" valign="top" align="center" class="m_6069702506707232563pd_10">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" class="m_6069702506707232563table" style="width:100%;max-width:600px">

<tbody><tr>
<td align="center" valign="top" class="m_6069702506707232563table" style="padding-top:20px;padding-left: 30px;padding-right: 30px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">

<tbody><tr>
<td aria-hidden="true" align="center" valign="top" style="padding:20px 0">
<img style="width:166px;display:block" src="https://i.imgur.com/8hsc8Vv.png" width="166" border="0">
</td>
</tr><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e5e7e8;border-right:1px solid #e5e7e8;border-top:1px solid #eff1f2;border-bottom:1px solid #e5e7e8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e0e2e3;border-right:1px solid #e0e2e3;border-top:1px solid #eefof1;border-bottom:1px solid #e0e2e3;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #dbdddd;border-right:1px solid #dbdddd;border-top:1px solid #eceeef;border-bottom:1px solid #dbdddd;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #d5d7d8;border-right:1px solid #d5d7d8;border-top:1px solid #e9ebec;border-bottom:1px solid #d5d7d8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-radius: 8px;border-collapse:collapse" width="100%" bgcolor="#ffffff">
<table role="presentation" border="0" cellpadding="0" cellspacing="0">

<tbody>
<tr>
<td align="left" valign="top" style="padding:40px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 600px;">
<tbody><tr>
<td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;text-align: center;">
<h2>Invitation</h2>
</td>
</tr>
<tr>
<td class="m_6069702506707232563pd_r0" align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;padding-right:0px">
<p>Dear Admin </p>
<p>
I’d like to invite you to join Fingerate Admin Panel. Please click on Accept Request and set your password.
</p>
</td>
</tr>
<tr>
<td align="center" valign="middle" style="border-radius:4px;background-color:#710093;color:#ffffff;text-align:center;vertical-align:middle">
<a href="${url}?token=${token}" style="border-radius:4px;color:#ffffff;font-size:16px;line-height:24px;font-family:Google Sans,Roboto,Arial,Helvetica,sans-serif;font-weight:500;border-top:12px solid #710093;border-right:24px solid #710093;border-bottom:12px solid #710093;border-left:24px solid #710093;text-decoration:none;display:block" target="_blank">
Accept Request
</a>
</td>
</tr>
<tr>
<td class="m_6069702506707232563pd_r0" align="left" valign="top" style="padding-top:30px;font-size:14px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-right:0px">
<p><strong>Or click the URL below to accept invitation</strong></p>
<p><a href="${url}?token=${token}" style="color: #710093;" target="_blank">
${url}?token=${token}
</a></p>
</td>
</tr>
<tr>
<td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-top:40px">
<strong>Thank You,<br>
FingeRate 2.0 Team</strong>
</td>
</tr>
</tbody></table>
</td>
</tr>

</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
<tr>
<td aria-hidden="true" align="center" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#fff;padding:10px">
Copyright © ${currentYear} FingeRate. All rights reserved.
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</body>
</html>`,
        });
        resolve();
      } catch (err) {
        // TODO: decide what to do with error
        new HttpException(
          {
            statusCode: ResponseCode.INTERNAL_ERROR,
            message: ResponseMessage.EMAIL_SENDING_ERROR,
          },
          ResponseCode.BAD_REQUEST,
        );
        resolve();
      }
    });
  }

  /**
   * Send Password Recovery Email To User on Forgot Password
   *
   * @param email
   * @param token
   */
  public async sendForgotPasswordMail(
    email: string,
    token: string,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const url = process.env.APP_URL + 'reset-password';
        const currentYear = new Date().getFullYear();
        await this.mailerService.sendMail({
          to: email,
          subject: 'Email Verification',
          html: `<html lang="en">
<head>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Rubik:400,700&display=swap" rel="stylesheet" type="text/css">
</head>
<body style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);">
<table bgcolor="#710093" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" height="100%" align="center">
<tbody><tr>
<td bgcolor="#710093" style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);" valign="top" align="center" class="m_6069702506707232563pd_10">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" class="m_6069702506707232563table" style="width:100%;max-width:600px">

<tbody><tr>
<td align="center" valign="top" class="m_6069702506707232563table" style="padding-top:20px;padding-left: 30px;padding-right: 30px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">

<tbody><tr>
<td aria-hidden="true" align="center" valign="top" style="padding:20px 0">
<img style="width:166px;display:block" src="https://i.imgur.com/8hsc8Vv.png" width="166" border="0">
</td>
</tr><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e5e7e8;border-right:1px solid #e5e7e8;border-top:1px solid #eff1f2;border-bottom:1px solid #e5e7e8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e0e2e3;border-right:1px solid #e0e2e3;border-top:1px solid #eefof1;border-bottom:1px solid #e0e2e3;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #dbdddd;border-right:1px solid #dbdddd;border-top:1px solid #eceeef;border-bottom:1px solid #dbdddd;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #d5d7d8;border-right:1px solid #d5d7d8;border-top:1px solid #e9ebec;border-bottom:1px solid #d5d7d8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-radius: 8px;border-collapse:collapse" width="100%" bgcolor="#ffffff">
<table role="presentation" border="0" cellpadding="0" cellspacing="0">

<tbody>
<tr>
<td align="left" valign="top" style="padding:40px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 600px;">
<tbody><tr>
<td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;text-align: center;">
<h2>Forgot Password</h2>
</td>
</tr>
<tr>
<td class="m_6069702506707232563pd_r0" align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;padding-right:0px">
<p>Dear Admin </p>
<p>
Please click the "Reset Password" button to reset your password.
  </p>
</td>
</tr>
<tr>
<td align="center" valign="middle" style="border-radius:4px;background-color:#710093;color:#ffffff;text-align:center;vertical-align:middle">
<a href="${url}?token=${token}" style="border-radius:4px;color:#ffffff;font-size:16px;line-height:24px;font-family:Google Sans,Roboto,Arial,Helvetica,sans-serif;font-weight:500;border-top:12px solid #710093;border-right:24px solid #710093;border-bottom:12px solid #710093;border-left:24px solid #710093;text-decoration:none;display:block" target="_blank">
Reset Password
</a>
</td>
</tr>
      <tr>
        <td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-top:15px">
          <strong>Thank You,<br>
          FingeRate 2.0 Team</strong>
        </td>
        </tr>
</tbody></table>
</td>
</tr>

</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
<tr>
<td aria-hidden="true" align="center" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#fff;padding:10px">
Copyright © ${currentYear} FingeRate. All rights reserved.
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</body>
</html>`,
        });
        resolve();
      } catch (err) {
        reject(
          new HttpException(
            {
              statusCode: ResponseCode.INTERNAL_ERROR,
              message: ResponseMessage.EMAIL_SENDING_ERROR,
            },
            ResponseCode.BAD_REQUEST,
          ),
        );
      }
    });
  }

  /**
   * Email verification code
   *
   * @param email
   * @param verificationCode
   */
  public async sendEmailVerificationCode(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const currentYear = new Date().getFullYear();
      try {
        await this.mailerService.sendMail({
          to: email,
          subject: 'Email Verification',
          html: `<html lang="en">
<head>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Rubik:400,700&display=swap" rel="stylesheet" type="text/css">
</head>
<body style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);">
<table bgcolor="#710093" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" height="100%" align="center">
<tbody><tr>
<td bgcolor="#710093" style="background: linear-gradient(180deg, #710093 0%, #960CBF 100%);" valign="top" align="center" class="m_6069702506707232563pd_10">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" class="m_6069702506707232563table" style="width:100%;max-width:600px">

<tbody><tr>
<td align="center" valign="top" class="m_6069702506707232563table" style="padding-top:20px;padding-left: 30px;padding-right: 30px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">

<tbody><tr>
<td aria-hidden="true" align="center" valign="top" style="padding:20px 0">
<img style="width:166px;display:block" src="https://i.imgur.com/8hsc8Vv.png" width="166" border="0">
</td>
</tr><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center">
<tbody><tr>
<td align="center" valign="top">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e5e7e8;border-right:1px solid #e5e7e8;border-top:1px solid #eff1f2;border-bottom:1px solid #e5e7e8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #e0e2e3;border-right:1px solid #e0e2e3;border-top:1px solid #eefof1;border-bottom:1px solid #e0e2e3;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #dbdddd;border-right:1px solid #dbdddd;border-top:1px solid #eceeef;border-bottom:1px solid #dbdddd;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-left:1px solid #d5d7d8;border-right:1px solid #d5d7d8;border-top:1px solid #e9ebec;border-bottom:1px solid #d5d7d8;border-collapse:collapse;border-radius:8px" align="center" bgcolor="#F8F9FA" valign="top" width="100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody><tr>
<td style="border-radius: 8px;border-collapse:collapse" width="100%" bgcolor="#ffffff">
<table role="presentation" border="0" cellpadding="0" cellspacing="0">

<tbody>
<tr>
<td align="left" valign="top" style="padding:40px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 600px;">
<tbody><tr>
<td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;text-align: center;">
<h2>Email Verification Code</h2>
</td>
</tr>
<tr>
<td class="m_6069702506707232563pd_r0" align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-bottom:15px;padding-right:0px">
<p>Dear FingeRate User </p>
<p>
This code remains valid for 3 minutes. Please do not disclose it to anyone (including FingeRate staff)
  </p>
</td>
</tr>
<tr>
<td align="center" valign="middle" style="background-color:#710093;border-radius:4px;color:#ffffff;font-size:16px;line-height:24px;font-family:Google Sans,Roboto,Arial,Helvetica,sans-serif;font-weight:500;border-top:12px solid #710093;border-right:24px solid #710093;border-bottom:12px solid #710093;border-left:24px solid #710093;text-decoration:none;display:block">
${verificationCode}
</td>
</tr>
      <tr>
        <td align="left" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#1f1f1f;padding-top:15px">
          <strong>Thank You,<br>
          FingeRate 2.0 Team</strong>
        </td>
        </tr>
</tbody></table>
</td>
</tr>

</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
<tr>
<td aria-hidden="true" align="center" valign="top" style="font-size:14px;line-height:24px;font-family:Rubik,Open Sans,Arial,sans-serif;color:#fff;padding:10px">
Copyright © ${currentYear} FingeRate. All rights reserved.
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</td>
</tr>
</tbody></table>
</body>
</html>
              `,
        });
        resolve();
      } catch (err) {
        console.log(err);

        reject(
          new HttpException(
            {
              statusCode: ResponseCode.EMAIL_SENDING_ERROR,
              message: ResponseMessage.EMAIL_SENDING_ERROR,
            },
            ResponseCode.BAD_REQUEST,
          ),
        );
      }
    });
  }

  static configureSendGrid() {
    return {
      transport: {
        service: 'sendgrid',
        host: 'smtp.sendgrid.net',
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      },
      defaults: {
        from: process.env.SENDGRID_EMAIL,
      },
    };
  }
}
