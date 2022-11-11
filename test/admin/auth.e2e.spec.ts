import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/modules/main/app.module';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { MailerMock, LoggerMock, SotDataMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { ResponseMessage } from '../../src/utils/enum';
import { AdminHelper } from '../admin.helper';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { generateToken } from 'authenticator';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin auth test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let server: any;
  let loginToken: any;
  let confirmEmailToken: any;
  let setPasswordToken: any;
  let code: any;
  const testUserDto = {
    email: 'test_fingerate_admin@yopmail.com',
    password: 'Test@12345',
    passwordConfirmation: 'Test@12345',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    helper = new AdminHelper(app);
    await helper.init();
    server = app.getHttpServer();
  });


  it(`Test /admin/auth/invite_admin API`, async () => {
    const data = {
      email: testUserDto.email,
    };
    await request(server)
      .post('/api/admin/auth/invite_admin')
      .set('Authorization', helper.getAccessToken())
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toBeDefined()
        confirmEmailToken = body.data.accessToken;
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test /admin/auth/confirm_email', async () => {
    await request(server)
      .get('/api/admin/auth/confirm_email')
      .set('Authorization', `Bearer ${confirmEmailToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toBeDefined()
      });
  });


  it('Test /admin/auth/set_password', async () => {
    
    await request(server)
      .patch('/api/admin/auth/set_password')
      .set('Authorization', `Bearer ${confirmEmailToken}`)
      .send(testUserDto)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toBeDefined()
        setPasswordToken = body.data.token;
      });
  });

  it(`Test /admin/auth/get_totp_uri`, async () => {
    await request(server)
      .get('/api/admin/auth/get_totp_uri')
      .set('Authorization', `Bearer ${setPasswordToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.toTpURI).toBeDefined();
        expect(body.data.formattedKey).toBeDefined();
        code = generateToken(body.data.formattedKey);
      });
  });
  
  it('Test /admin/auth/verify2fa', async () => {
    const twoFACode = {
      code:  code
    };
    await request(server)
      .post('/api/admin/auth/verify_2fa')
      .set('user-agent', 'chrome')
      .set('Authorization', `Bearer ${setPasswordToken}`)
      .send(twoFACode)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
        
      });
  });

  it('Test /admin/auth/login', async () => {
    loginToken = await helper.login(testUserDto.email, testUserDto.password);
  });


  it(`Test /admin/auth/forgot_password`, async () => {
    await request(server)
      .post('/api/admin/auth/forgot_password')
      .send({
        email: testUserDto.email,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.FORGOT_PASSWORD_EMAIL);
      });
  });

  

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
