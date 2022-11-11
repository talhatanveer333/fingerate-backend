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
import { EventBanner } from '../../src/modules/eventbanner/eventbanner.entity';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin event banner test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
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
    helper = new AdminHelper(app);
    await helper.init();
    const media = await helper.createMedia('SomeRandomMediaKey');
    mediaId = media.uuid;
    server = app.getHttpServer();
  });

  it('Test admin/event_banner/create API', async () => {
    const eventBannerPayload = {
      title: 'Title',
      content: 'Content',
      status: 'Active',
      pushLink: 'https://www.test.com',
      image: 'SomeRandomMediaKey',
    };
    await request(server)
      .post(`/api/admin/event_banner/create`)
      .set('Authorization', helper.getAccessToken())
      .send(eventBannerPayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.CREATED_SUCCESSFULLY);
        eventBanner = body.eventBanner;
      });
  });

  it('Test admin/event_banner/:uuid API', async () => {
    const eventBannerPayload = {
      title: 'Title',
      content: 'Content',
      status: 'Active',
      pushLink: 'https://www.test.com',
      image: eventBanner.image,
    };
    await request(server)
      .put(`/api/admin/event_banner/${eventBanner.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .send(eventBannerPayload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        eventBanner.content = eventBannerPayload.content;
      });
  });

  it('Test admin/event_banner/list API', async () => {
    await request(server)
      .get(`/api/admin/event_banner/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const expected = {
          items: [eventBanner],
          meta: {
            totalItems: 1,
            itemCount: 1,
            itemsPerPage: 10,
            totalPages: 1,
            currentPage: 1,
          },
        };
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/event_banner/id/:uuid`, async () => {
    const expected = {
      uuid: eventBanner.uuid,
      title: 'Title',
      content: 'Content',
      pushLink: 'https://www.test.com',
      image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
      status: 'Active'
    }
    await request(server)
      .get(`/api/admin/event_banner/id/${eventBanner.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, ...otherData } = body.data;
        expect(otherData).toEqual(expected);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
