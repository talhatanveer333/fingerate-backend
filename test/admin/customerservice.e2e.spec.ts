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
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin customerservice test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let server: any;
  let inquiryId: string;

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

  it(`Test admin/customerservice/reply`, async () => {
    const inquiry = await helper.setupCustomerServiceProcess();
    inquiryId = inquiry.uuid;
    await request(server)
      .post(`/api/admin/customerservice/reply`)
      .set('Authorization', helper.getAccessToken())
      .send({
        inquiryId: inquiry.uuid,
        reply: "I am the reply",
        memo: 'I am the memo',
        status: "Completed"
      })
      .expect(200)
  });

  it(`Test admin/customerservice/list`, async () => {
    const expected = {
      title: 'I am the title',
      description: 'I am the content',
      status: 'Completed',
      admin: 'test_fingerate_admin_helper@yopmail.com',
      attachments: '0'
    }
    await request(server)
      .get(`/api/admin/customerservice/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, updatedAt, uuid, username, ...remainingBody } = body.data.result[0];
        expect(remainingBody).toEqual(expected);
      });
  });

  it(`Test admin/customerservice/id/:uuid`, async () => {
    const expected = {
      inquiry: {
        uuid: inquiryId,
        title: 'I am the title',
        reply: "I am the reply",
        content: 'I am the content',
        status: 'Completed',
        attachments: []
      },
      user: {
        email: "newTestUser@yopmail.com",
        noOfSOM: 5000,
        noOfInquiries: 2,
        country: null,
        referralCode: "test321HFJ"
      },
      statusHistory: [
        {
          admin: { email: "test_fingerate_admin_helper@yopmail.com" },
          memo: 'I am the memo',
        }
      ]
    }
    await request(server)
      .get(`/api/admin/customerservice/id/${inquiryId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { user: { uuid, nickName, recommender, registrationDate, deviceUsed, ...remainingUser }, ...otherBody } = body.data;
        const { createdAt, uuid: replyUuid, ...remainingReply } = body.data.statusHistory[0];
        body.data.statusHistory[0] = remainingReply;
        body.data.user = remainingUser;
        delete otherBody.inquiry.createdAt;
        delete otherBody.inquiry.updatedAt;
        body.data.inquiry = otherBody.inquiry;
        expect(body.data).toEqual(expected);
      });
  });


  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
