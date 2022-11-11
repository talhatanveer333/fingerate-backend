import * as http from 'http';
import express, { Request, Response } from 'express';

export const MailerMock = {
  sendEmailVerificationCode: jest.fn(() => {
    return;
  }),
  sendForgotPasswordMail: jest.fn(() => {
    return;
  }),
  sendAdminEmailConfirmation: jest.fn(() => { }),

  sendSurveyResult: jest.fn(() => {
    return;
  }),
  sendEmail: jest.fn(() => {
    return;
  }),
};

export const LoggerMock = {
  log: jest.fn((value: string) => {
    return;
  }),
  error: jest.fn((value: string) => {
    return;
  }),
  setContext: jest.fn((value: string) => {
    return;
  }),
  debug: jest.fn(() => {
    return;
  }),
};

export const S3Mock = {
  upload: jest.fn(() => {
    return { Key: '2022-08-29T09:43:03.528Z_xHsUyWI.png' };
  }),
  getSignedURL: jest.fn(() => {
    return '2022-08-29T09:43:03.528Z_xHsUyWI.png';
  }),
  getPublicURL: jest.fn(() => {
    return '2022-08-29T09:43:03.528Z_xHsUyWI.png';
  }),
  deleteObject: jest.fn(() => {
    return;
  }),
};

export const SotDataMock = {
  getTokenMetaData: jest.fn(() => {
    return `https://res.cloudinary.com/dhxeeeqc8/raw/upload/v1664865929/IRL00002.json`;
  }),
  getTokenOwner: jest.fn(() => {
    return `0xsdfsd6fsdf78s5fsdfsdfsdf8s6df86sdfs`;
  }),
  getTransactionTime: jest.fn(() => {
    return 1678953;
  }),
};

export const MockBullQueue = {
  add: jest.fn(() => {
    return;
  }),
  process: jest.fn(() => {
    return;
  }),
};

export class MockServer {
  public server: http.Server;
  private app: express.Application;
  constructor(port: number, done: () => void) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.server.listen(port, () => {
      done();
    });
    this.app.post(
      `${process.env.NAVER_GET_USER}`,
      (req: Request, res: Response) => {
        const success = {
          success: true,
          message: 'successfully login',
          response: {
            email: 'test@yopmail',
          },
        };
        return res.status(200).send(success);
      },
    );

    this.app.post(
      `${process.env.KAKAO_GET_USER}`,
      (req: Request, res: Response) => {
        const success = {
          success: true,
          message: 'successfully login',
          kakao_account: {
            email: 'test@yopmail',
          },
        };
        return res.status(200).send(success);
      },
    );

    /**
     * Toss Payment Api Mock
     */
    this.app.post(`/v1/payments/confirm`, (req: Request, res: Response) => {
      return res.status(200).send({ success: true });
    });
  }
}

export const ExchangeServiceMock = {
  getPrice: jest.fn(() => {
    return 1465;
  })
};

export const CoinGeckoServiceMock = {
  getPrice: jest.fn(() => {
    const resObj = {};
    resObj['btour-chain'] = { usd: 0.071546 }
    return resObj;
  }),
  ping: jest.fn(() => {
    return true;
  })
};

export const CacheManagerMock = {
  checkIfUserBlocked: jest.fn(() => {
    return 0;
  }),
  deleteFailedLoginAttempts: jest.fn(),
  deleteEmailOTPAttempts: jest.fn(),
  deleteFailedEmailOTPAttempts: jest.fn(),
  deleteFailedBlockCount: jest.fn(),
  deleteOTP: jest.fn(),
  setOTP: jest.fn(() => {
    return '123456';
  }),
  getOTP: jest.fn(() => '123456'),
  updateEmailOTPAttempts: jest.fn(() => 1),
  updateFailedLoginAttempts: jest.fn(),
};

export const NotificationMock = {
  saveNotifications: jest.fn(() => {
    return;
  }),
  sendMessage: jest.fn(() => {
    return;
  }),
  sendPushNotification: jest.fn(() => {
    return;
  }),
  saveUserNotifications: jest.fn(() => {
    return;
  }),
};
