import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AdminHelper } from '../../admin.helper';
import { FAQ } from '../../../src/modules/faq/faq.entity';
import { MailService } from '../../../src/utils/mailer/mail.service';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock } from '../../mocks/mocks';
import { S3Service } from '../../../src/utils/s3/s3.service';
import { LoggerService } from '../../../src/utils/logger/logger.service';
import { AppModule } from '../../../src/modules/main/app.module';
import { ResponseMessage } from '../../../src/utils/enum';
import { ExchangeService } from '../../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate faq admin test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
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
    helper = new AdminHelper(app);
    await helper.init();
    const media = await helper.createMedia('SomeRandomMediaKey');
    mediaId = media.uuid;
    server = app.getHttpServer();
  });

  it('TestAdminFAQ/create API', async () => {
    const faqPayload = {
      title: 'Title',
      content: 'Content',
      status: 'Active',
      image: 'SomeRandomMediaKey',
    };
    await request(server)
      .post(`/api/admin/faq`)
      .set('Authorization', helper.getAccessToken())
      .send(faqPayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.CREATED_SUCCESSFULLY);
        faq = body.faq;
      });
  });

  it('TestAdminFAQ/update API', async () => {
    const faqPayload = {
      title: 'Title',
      content: 'Content1',
      status: 'Active',
      image: faq.image,
    };
    await request(server)
      .put(`/api/admin/faq/${faq.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .send(faqPayload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        faq.content = faqPayload.content;
      });
  });

  it('TestAdminFAQ/list API', async () => {
    await request(server)
      .get(`/api/admin/faq/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const expected = {
          items: [faq],
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

  it(`Test admin/faq/id/:uuid`, async () => {
    const expected = {
      uuid: faq.uuid,
      title: 'Title',
      content: 'Content1',
      image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
      status: 'Active'
    }
    await request(server)
      .get(`/api/admin/faq/id/${faq.uuid}`)
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
