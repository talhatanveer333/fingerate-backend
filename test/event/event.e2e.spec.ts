import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock, SotDataMock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { MailService } from '../../src/utils/mailer/mail.service';
import dayjs from 'dayjs';
import { S3Service } from '../../src/utils/s3/s3.service';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate event test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let currentDate = dayjs().unix();

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
    await helper.init();
    helper.startTestWebSocketServer();
    server = app.getHttpServer();
  });

  it(`Test event/mark_attendance API`, async () => {
    await request(server)
      .post(`/api/event/mark_attendance`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });


  it('Test event/monthly_attendance API', async () => {
    const user: any = await helper.getUserByEmail('testuser@yopmail.com');
    await helper.createUserAttendance(user);
    await request(server)
      .get(`/api/event/monthly_attendance?date=${currentDate}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    helper.stopTestWebSocketServer();
    await app.close();
  });
});
