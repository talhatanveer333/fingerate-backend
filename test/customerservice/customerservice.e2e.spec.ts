import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { InquiryStatus } from '../../src/modules/customerservice/common/customerservice.enum';
import { S3Service } from '../../src/utils/s3/s3.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate Customer Service test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let inquiryId: string;
  let attachmentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(S3Service)
      .useValue(S3Mock)
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
    server = app.getHttpServer();
  });

  it(`Test customer_service/register_inquiry API`, async () => {
    const media = await helper.createMedia(
      '2022-09-28T05:20:50.182Z_cartoon.png',
    );
    const data = {
      title: 'test',
      content: 'test',
      attachments: [media.key],
    };
    await request(server)
      .post('/api/customer_service/register_inquiry')
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test customer_service/inquiries_list API', async () => {
    const expected = {
      title: 'test',
      content: 'test',
      status: InquiryStatus.WAITING_FOR_AN_ANSWER,
      reply: null
    };
    await request(server)
      .get(`/api/customer_service/inquiries_list?page=1&pageSize=3`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        inquiryId = body.data.inquires.items[0]['uuid'];
        const { uuid, createdAt, updatedAt, image = body.data.inquires.items[0].image, ...newBody } = body.data.inquires.items[0];
        expect(newBody).toEqual(expected);
      });
  });

  it(`Test customer_service/edit_inquiry/:inquiryId API`, async () => {
    const data = {
      title: 'New test',
      content: 'New test',
    };
    await request(server)
      .put(`/api/customer_service/edit_inquiry/${inquiryId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .send(data)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test  customer_service/inquiry/:inquiryId API', async () => {
    const expected = {
      title: 'New test',
      content: 'New test',
      status: InquiryStatus.WAITING_FOR_AN_ANSWER,
      reply: null
    };

    await request(server)
      .get(`/api/customer_service/inquiry/${inquiryId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        attachmentId = body.data.attachments[0].uuid;
        const { uuid, createdAt, updatedAt, attachments, ...received } = body.data;
        expect(received).toEqual(expected);
      });
  });

  it(`Test customer_service/delete_inquiry_attachment/:id API`, async () => {
    await request(server)
      .delete(`/api/customer_service/delete_inquiry_attachment/${attachmentId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test customer_service/inquiry/:inquiryId API', async () => {
    const expected = {
      raw: [],
      affected: 1,
    };
    await request(server)
      .delete(`/api/customer_service/inquiry/${inquiryId}`)
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
