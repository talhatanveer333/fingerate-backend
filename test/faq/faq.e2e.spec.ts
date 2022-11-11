import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { S3Service } from '../../src/utils/s3/s3.service';
import { FAQ } from '../../src/modules/faq/faq.entity';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate faq test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let faq: FAQ;
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
    faq = await helper.createFAQ();
    mediaId = media.uuid;
    server = app.getHttpServer();
  });

  it('TestFAQ/get_all_active_faqs API', async () => {
    const expected = {
      faqs: [faq],
      total: '1',
    };
    await request(server)
      .get(`/api/faq`)
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
