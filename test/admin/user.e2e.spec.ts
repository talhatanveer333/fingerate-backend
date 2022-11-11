import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/modules/main/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminHelper } from '../admin.helper';
import request from 'supertest';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { MailerMock, LoggerMock, SotDataMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { UserStatusEnum } from '../../src/modules/auth/common/auth.enums';
import { UserGraphStatDTO } from '../../src/modules/admin/user/commons/user.dto';
import { AvatarCategoryEnum, AvatarItemNameEnum } from '../../src/modules/marketplace/common/marketplace.enums';
import { Payment } from '../../src/modules/payment/payment.entity';
import { User } from '../../src/modules/user';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin user test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let server: any;
  let user: User;

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
    user = await helper.createUser('testUser123@fingerate.com');
    server = app.getHttpServer();
  });

  it(`Test /admin/user/list`, async () => {
    const expectedUser = {
      users: [
        {
          nickName: null,
          email: 'testUser123@fingerate.com',
          status: UserStatusEnum.ACTIVE,
          balance: 5000,
          survey_requests: 0,
          respect_level: 1,
          referrals: 0,
        },
      ],
      meta: { total_count: 1 },
    };
    await request(server)
      .get(`/api/admin/user/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, uuid, ...result } = body.data.users[0];
        body.data.users[0] = result;
        expect(body.data).toEqual(expectedUser);
      });
  });

  it(`Test /admin/user/id/:uuid`, async () => {
    const expectedUser = {
      uuid: user.uuid,
      country: null,
      email: 'testUser123@fingerate.com',
      balance: 5000,
      referralCode: user.referralCode,
      respectLevel: user.respectLevel,
      status: 'Active',
      nickName: null,
      device_info: {},
      survey_requests: 0,
    };
    await request(server)
      .get(`/api/admin/user/id/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, ...newBody } = body.data;
        expect(newBody).toEqual(expectedUser);
      });
  });

  // it('Test admin/user/graph_stats', async () => {
  //   await request(server)
  //     .get('/api/admin/user/graph_stats')
  //     .set('Authorization', helper.getAccessToken())
  //     .expect(200)
  //     .expect(({ body }) => {
  //       expect(body).toBeDefined()
  //     })
  // });

  it('Test admin/user/referrals/:uuid', async () => {
    const user: any = await helper.getUserByEmail('testUser123@fingerate.com');
    const newUser = await helper.createUser('testUser678@fingerate.com');
    newUser.referredBy = user.referralCode;
    newUser.nickName = 'nickname678';
    await helper.updateUser(newUser);
    const expected = {
      uuid: newUser.uuid,
      email: newUser.email,
      nickName: newUser.nickName,
      createdAt: newUser.createdAt,
    };
    await request(server)
      .get(`/api/admin/user/referrals/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data?.users?.[0]).toEqual(expected);
      });
  });

  it('Test admin/user/purchases/:uuid', async () => {
    const payment: Payment = await helper.createPayment(user);
    const expected = {
      purchases: [{
        amount: payment.amount,
        createdAt: payment.createdAt,
        item_name: AvatarItemNameEnum.MALELONGHAIRS,
        category: AvatarCategoryEnum.HAIRS
      }],
      meta: {
        total_count: 1
      }
    }
    await request(server)
      .get(`/api/admin/user/purchases/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it('Test admin/user/status/:uuid', async () => {
    const user: any = await helper.getUserByEmail('testUser123@fingerate.com');
    const payload = {
      status: 'Disabled',
      reason: 'Some reason...',
    };
    await request(server)
      .patch(`/api/admin/user/status/${user.uuid}`)
      .send(payload)
      .set('Authorization', helper.getAccessToken())
      .expect(200);
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
