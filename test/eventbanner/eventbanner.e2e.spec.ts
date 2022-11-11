import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { S3Service } from '../../src/utils/s3/s3.service';
import { EventBanner } from '../../src/modules/eventbanner/eventbanner.entity';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate event banner test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let eventBanner: EventBanner;
  let mediaId: string;

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
    helper = new AppHelper(app);
    await helper.init();
    const media = await helper.createMedia('SomeRandomMediaKey');
    eventBanner = await helper.createEventBanner();
    mediaId = media.uuid;
    server = app.getHttpServer();
  });

  it('Test event_banner/list API', async () => {
    const expected = {
      eventBanners: [eventBanner],
      total: '1',
    };
    await request(server)
      .get(`/api/event_banner/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
