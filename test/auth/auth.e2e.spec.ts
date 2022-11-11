import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { MailService } from '../../src/utils/mailer/mail.service';
import {
  CacheManagerMock,
  CoinGeckoServiceMock,
  ExchangeServiceMock,
  LoggerMock,
  MailerMock,
  MockServer,
  SotDataMock,
} from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { MessageBirdService } from '../../src/utils/messagebird/messagebird.service';
import { MessagebirdMock } from '../mocks';
import { CacheManagerService } from '../../src/modules/cache-manager/cache-manager.service';
import { LoginType } from '../../src/modules/auth/common/auth.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate auth test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let token: string;
  let mockServer: MockServer;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(MessageBirdService)
      .useValue(MessagebirdMock)
      .overrideProvider(CacheManagerService)
      .useValue(CacheManagerMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    helper = new AppHelper(app);
    server = app.getHttpServer();
    (async () => {
      return new Promise<void>((resolve, reject) => {
        mockServer = new MockServer(3340, resolve);
      });
    })();
  });

  /*************************************************************************************************/
  /*
  /*            Email Verification Code and Update Unser Info
  /*
  /*************************************************************************************************/

  it(`Test auth/email_verification_code API`, async () => {
    await request(server)
      .post('/api/auth/email_verification_code')
      .send({
        email: `testuser@yopmail.com`,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test auth/verify_email_code API`, async () => {
    const data = {
      email: 'testuser@yopmail.com',
      code: '123456',
    };
    await request(server)
      .post('/api/auth/verify_email_code')
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test /auth/create_password API', async () => {
    let PasswordDto = {
      password: 'Test!234',
      passwordConfirmation: 'Test!234',
    };
    return request(server)
      .post(`/api/auth/create_password/?email=testuser@yopmail.com`)
      .set('deviceinfo', '{}')
      .send(PasswordDto)
      .expect(200)
      .expect(({ body }) => {
        token = body.data;
      });
  });

  it(`Test auth/update_user_info update User Additional Info API`, async () => {
    const data = {
      nickName: 'HelloUSerONE',
      age: 1922,
      gender: 'male',
    };
    await request(server)
      .patch('/api/auth/update_user_info')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test auth/update_user_info Update User Avatar API`, async () => {
    const data = {
      avatar: '{}'
    };
    await request(server)
      .patch('/api/auth/update_user_info')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test /auth/check_nick_name API', async () => {
    let user: any = await helper.getUserByEmail('testuser@yopmail.com');
    user.nickName = 'test123';
    return request(server)
      .get(`/api/auth/check_nick_name/?nickName=${user.nickName}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.available).toBe(true);
      });
  });

  it('Test /auth/check_referral_code API', async () => {
    let firstUser: any = await helper.getUserByEmail('testuser@yopmail.com');
    firstUser.referralCode = '1234567898';
    firstUser = await helper.updateUser(firstUser);
    let secondUser = await helper.createUser('testuserdb@yopmail.com');
    const data = { referralCode: secondUser.referralCode };
    return request(server)
      .post(`/api/auth/check_referral_code`)
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test auth/login API`, async () => {
    await helper.login('testuser@yopmail.com', 'Test!234');
  });

  it(`Test auth/social_login API`, async () => {
    await request(server)
      .post(`/api/auth/social_login`)
      .set('deviceinfo', '{}')
      .send({
        token: `AAAAO3yhjdaiei7qesDtO6pUi7QekVidi_FSb3oHfsEzEpCdoTg5If-VSq9UDyIn-zDJt1GSQga0IMyaQQNCMcX7hFo`,
        loginType: LoginType.NAVER,
        autoLogin: false,
        deviceId: '12342443222s',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
      });

    await request(server)
      .post(`/api/auth/social_login`)
      .set('deviceinfo', '{}')
      .send({
        token: `AAAAO3yhjdaiei7qesDtO6pUi7QekVidi_FSb3oHfsEzEpCdoTg5If-VSq9UDyIn-zDJt1GSQga0IMyaQQNCMcX7hFo`,
        loginType: LoginType.KAKAO,
        autoLogin: false,
        deviceId: '12342443222s',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
      });
  });

  it(`Test /forgot_password API`, async () => {
    await request(server)
      .post(`/api/auth/forgot_password`)
      .send({
        email: `testuser@yopmail.com`,
      })
      .expect(200);
  });

  it(`Test /verify_forgot_password_code API`, async () => {
    await request(server)
      .get(
        `/api/auth/verify_forgot_password_code?email=testuser@yopmail.com&code=123456`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test /confirm_forgot_password API`, async () => {
    await request(server)
      .post(`/api/auth/confirm_forgot_password`)
      .send({
        email: 'testuser@yopmail.com',
        code: '123456',
        password: `Rnssol@21`,
        passwordConfirmation: `Rnssol@21`,
      })
      .expect(200);
  });

  it(`Test /login_new_user_auto_login`, async () => {
    const testUserDto = {
      email: 'testuser@yopmail.com',
      password: 'Rnssol@21',
      autoLogin: true,
    };
    await request(server)
      .post(`/api/auth/login`)
      .set('deviceinfo', '{}')
      .send(testUserDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
        token = body.data;
      });
  });

  it(`Test api/auth/validate_phone_number API`, async () => {
    const sendOtpDTO = {
      country: 'Pakistan',
      phoneNumber: '+923401232123',
      email: 'testuser@yopmail.com',
    };
    await request(server)
      .post('/api/auth/validate_phone_number')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', /json/)
      .send(sendOtpDTO)
      .expect(200);
  });

  it(`Test api/auth/validate_token API`, async () => {
    const sendOtpDTO = {
      country: 'Pakistan',
      phoneNumber: '+923401232123',
      email: 'testuser@yopmail.com',
      token: `123456`,
    };
    await request(server)
      .post('/api/auth/validate_phone_otp')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .send(sendOtpDTO)
      .expect(200);
  });

  it(`Test /logout API`, async () => {
    await request(server)
      .post(`/api/auth/logout?deviceId=543234`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  afterAll(async () => {
    mockServer.server.close();
    await helper.clearDB();
    await app.close();
  });
});
