import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { LoggerMock, SotDataMock, NotificationMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { NotificationService } from '../../src/utils/notification/notification.service';
import {
  NotificationBody,
  NotificationTitle,
  NotificationType,
} from './../../src/utils/notification/common/index.enums';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate user test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(NotificationService)
      .useValue(NotificationMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(NotificationService)
      .useValue(NotificationMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    helper = new AppHelper(app);
    await helper.init();
    server = app.getHttpServer();
  });

  it(`Test user/me API`, async () => {
    const user: any = await helper.getUserByEmail('testuser@yopmail.com');
    user.age = 2000;
    user.country = 'Pakistan';
    user.gender = 'male';
    user.nickName = 'test';
    user.phoneNumber = '1234567891';
    user.wallet = null;
    user.avatar = null;
    user.cart = null;
    const updatedUser = await helper.updateUser(user);
    const expected = helper.removeUserExtraFields(updatedUser);
    const token = helper.getAccessToken();
    await request(server)
      .get('/api/user/me')
      .set('Authorization', token)
      .expect(200)
      .expect(({ body }) => {
        const received = helper.removeReceivedExtraFields(body.data);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(received).toEqual(expected);
      });
  });

  it('Test user/change_password API', async () => {
    const token = helper.getAccessToken();
    const changePasswordDto = {
      currentPassword: 'Test!234',
      newPassword: 'Test!1235',
      newPasswordConfirmation: 'Test!1235',
    };
    await request(server)
      .post('/api/user/change_password')
      .set('Authorization', token)
      .send(changePasswordDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.PASS_CHANGE_SUCCESS);
      });
  });

  it('Test user/change_nickname API', async () => {
    const token = helper.getAccessToken();
    const changeNickNamedDto = {
      nickName: 'testnickname',
    };
    await request(server)
      .post('/api/user/change_nickname')
      .set('Authorization', token)
      .send(changeNickNamedDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test user/update_fcm_token API', async () => {
    const token = helper.getAccessToken();
    const fmcTokenDto = {
      token: 'test token',
    };
    await request(server)
      .patch('/api/user/update_fcm_token')
      .set('Authorization', token)
      .send(fmcTokenDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test user/referrals API', async () => {
    const user: any = await helper.getUserByEmail('testuser@yopmail.com');
    const newUser = await helper.createUser('newTestUser@yopmail.com');
    newUser.referredBy = user.referralCode;
    newUser.nickName = 'tinku';
    await helper.updateUser(newUser);
    const expected = {
      nickName: newUser.nickName,
      createdAt: newUser.createdAt,
    };
    await request(server)
      .get('/api/user/referrals')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data[0]).toEqual(expected);
      });
  });

  it(`Test user/withdraw_membership API`, async () => {
    const data = {
      email: 'testuser@yopmail.com',
      password: 'Test!1235',
    };
    await request(server)
      .post('/api/user/withdraw_membership')
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test user/transaction_history API', async () => {
    await helper.login('newTestUser@yopmail.com', 'Test!234');
    const user: any = await helper.getUserByEmail('newTestUser@yopmail.com');
    await helper.rechargeUserWallet(user.wallet);
    const expected = {
      type: 'Wallet Recharge',
      amount: 100,
      surveyTitle: null,
      itemName: null,
      transactionType: 'inbound',
    };

    await request(server)
      .get('/api/user/transaction_history?type=all')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { id, walletId, createdAt, ...received } = body.data[0];
        expect(received).toEqual(expected);
      });
  });

  /** ******************************************************************************************************************/
  /*
  /*                                   Notifications
  /*
  /********************************************************************************************************************/

  it('Test user/update_notification_setting API', async () => {
    const payload = {
      all: true,
      dailyCheck: false,
      dailySurveyParticipation: false,
      surveyRequest: false,
      allUser: false,
      participation: false,
      surveyGoesLive: false,
    };
    await request(server)
      .patch('/api/user/update_notification_setting')
      .set('Authorization', helper.getAccessToken())
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test user/unread_notification_count API', async () => {
    const user: any = await helper.getUserByEmail('newTestUser@yopmail.com');
    await helper.createUserNotification(user);
    const expected: number = 1;
    await request(server)
      .get('/api/user/unread_notification_count')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(body.data).toEqual(expected);
      });
  });

  it('Test user/get_notification API', async () => {
    const expected = {
      type: NotificationType.SURVEY_GOES_LIVE,
      title: NotificationTitle.SURVEY_GOES_LIVE,
      body: NotificationBody.SURVEY_GOES_LIVE,
      isSettled: false,
    };
    const expectedPagination = {
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 1,
    };
    await request(server)
      .get('/api/user/get_notification')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { uuid, createdAt, ...received } =
          body.data.notifications.items[0];
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(received).toEqual(expected);
        expect(body.data.notifications.meta).toEqual(expectedPagination);
      });
  });

  it('Test user/notification_history', async () => {
    await request(server)
      .delete('/api/user/notification_history')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
