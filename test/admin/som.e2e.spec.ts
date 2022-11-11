import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AdminHelper } from '../admin.helper';
import { MailService } from '../../src/utils/mailer/mail.service';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock } from '../mocks/mocks';
import { S3Service } from '../../src/utils/s3/s3.service';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { AppModule } from '../../src/modules/main/app.module';
import { ResponseMessage } from '../../src/utils/enum';
import { User } from '../../src/modules/user';
import { InfoReward } from '../../src/modules/user/common/user.enums';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate som admin test', () => {
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
      .overrideProvider(S3Service)
      .useValue(S3Mock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    helper = new AdminHelper(app);
    await helper.init();
    user = await helper.createUser('TestUser@gmail.com');
    server = app.getHttpServer();
  });

  it(`Test admin/som/user_list`, async () => {
    const expected = {
      email: 'TestUser@gmail.com',
      nickName: null,
      phoneNumber: null,
      balance: 5000,
    };
    await request(server)
      .get(`/api/admin/som/user_list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { date, uuid, ...oneUser } = body.data.records[0];
        expect(oneUser).toEqual(expected);
      });
  });

  it(`Test admin/som/user_details/:uuid`, async () => {
    const expected = {
      email: 'TestUser@gmail.com',
      nickName: null,
      phoneNumber: null,
    };
    await request(server)
      .get(`/api/admin/som/user_details/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { uuid, walletId, ...otherData } = body.data;
        expect(otherData).toEqual(expected);
      });
  });

  it(`Test admin/som/user_history/:uuid`, async () => {
    const expected = {
      records: [],
      meta: { totalCount: '0' },
    };
    await request(server)
      .get(`/api/admin/som/user_history/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/som/statistics GET API`, async () => {
    await helper.makeRecharge(user);
    await helper.giveReward(user);
    const ExpectedResponse = {
      totalSOM: 5000,
      totalPurchasedSOM: 400,
      totalRewardSOM: InfoReward.THIRTY,
    };
    await request(server)
      .get('/api/admin/som/statistics')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        delete body.data.graphSOM;
        expect(body.data).toEqual(ExpectedResponse);
      });
    expect(server).toBeDefined();
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
