import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/modules/main/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminHelper } from '../admin.helper';
import request from 'supertest';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { MailerMock, LoggerMock, SotDataMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { ResponseMessage } from '../../src/utils/enum';
import { AccountStatus } from '../../src/modules/admin/admin/commons/admin.enum';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admins test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let server: any;
  let admin_id: string;

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

  it(`Test admin/list GET API`, async () => {
    const ExpectedResponse = {
      admins: [
        {
          email: 'test_fingerate_admin_helper@yopmail.com',
          status: AccountStatus.ACTIVE,
        }
      ],
      meta: {
        total_count: 1
      },
    };
    await request(server)
      .get('/api/admin/list?email=test_fingerate_admin_helper')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        admin_id = body.data.admins[0].uuid;
        body.data.admins.map((m) => {
          delete m.uuid;
          delete m.created_at;
          delete m.last_login;
        })
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(body.data).toEqual(ExpectedResponse);
      });
    expect(server).toBeDefined();
  });

  it(`Test admin/id/:uuid GET API`, async () => {
    const ExpectedResponse = {
      email: 'test_fingerate_admin_helper@yopmail.com',
      status: AccountStatus.ACTIVE,
    };
    await request(server)
      .get('/api/admin/id/' + admin_id)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { uuid, created_at, last_login, ...respose } = body.data;
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(respose).toEqual(ExpectedResponse);
      });
    expect(server).toBeDefined();
  });

  it(`Test admin/history/:uuid GET API`, async () => {
    const ExpectedResponse = {
      items: [
        {
          IP: '127.0.0.1',
          browser: 'Chrome',
        },
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    };
    await request(server)
      .get('/api/admin/history/' + admin_id)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(body).toBeDefined()
      });
    expect(server).toBeDefined();
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
