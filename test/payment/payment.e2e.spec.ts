import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import {
  CoinGeckoServiceMock,
  ExchangeServiceMock,
  LoggerMock,
  MailerMock,
  MockBullQueue,
  MockServer,
  NotificationMock,
  S3Mock,
  SotDataMock,
} from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { MailService } from '../../src/utils/mailer/mail.service';
import { S3Service } from '../../src/utils/s3/s3.service';
import { QueueName } from '../../src/modules/worker/common/worker.enums';
import { getQueueToken } from '@nestjs/bull';
import { WorkerProcessor } from '../../src/modules/worker/worker.processor';
import { JobEvents } from '../../src/modules/sot/common/sot.enums';
import { SurveyStatus } from '../../src/modules/survey/common/survey.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { NotificationService } from '../../src/utils/notification/notification.service';
import { User } from '../../src/modules/user/user.entity';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate Payment test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let surveyId: string;
  let sotId: string;
  let job: any = {};
  let user: User | undefined;
  let workerProcessor: WorkerProcessor;
  let mockServer: MockServer;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(NotificationService)
      .useValue(NotificationMock)
      .overrideProvider(S3Service)
      .useValue(S3Mock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(getQueueToken(QueueName.DEFAULT))
      .useValue(MockBullQueue)
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
    workerProcessor = app.get(WorkerProcessor);
    helper = new AppHelper(app);
    await helper.init();
    helper.startTestWebSocketServer();
    server = app.getHttpServer();
    (async () => {
      return new Promise<void>((resolve, reject) => {
        mockServer = new MockServer(3340, resolve);
      });
    })();
  });

  it('Test payment/make_survey_payment/:surveyId API', async () => {
    user = await helper.getUserByEmail('testuser@yopmail.com');
    await helper.initializeWallet(user);
    const survey = await helper.createSurvey(user);
    const sot = await helper.createSot();
    sotId = sot?.uuid;
    surveyId = survey?.uuid;
    await helper.assignSurveyToSot(survey?.uuid, sot?.uuid);
    const admin = await helper.createUser('adminF@yopmail.com');
    await helper.initializeWallet(admin);
    await request(server)
      .post(`/api/payment/make_survey_payment/${survey.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test sot profit distribution after payment', async () => {
    const pendingProfit = await helper.getPendingProfit();
    const OWNER_ADDRESS = '0xsadffsdfsdfs9wur3847fydsf7s98d7vx';
    const amountInSom = 37.5;
    expect(pendingProfit.ownerAddress).toEqual(OWNER_ADDRESS);
    expect(pendingProfit.amountInSom).toEqual(amountInSom);
    expect(pendingProfit.surveyId).toEqual(surveyId);
  });

  it(`Test Start Survey Processing Function`, async () => {
    job.data = { surveyId };
    await workerProcessor.startSurvey(job).then((result) => {
      expect(result).toEqual(JobEvents.Completed);
    });
  });

  it(`Test Survey Status Ongoing`, async () => {
    const newSurvey = await helper.getSurveyById(surveyId);
    expect(newSurvey?.status).toEqual(SurveyStatus.ONGOING);
  });

  it(`Test End Survey Processing Function`, async () => {
    job.data = { surveyId };
    await workerProcessor.endSurvey(job).then((result) => {
      expect(result).toEqual(JobEvents.Completed);
    });
  });

  it(`Test Survey Status Ended`, async () => {
    const newSurvey = await helper.getSurveyById(surveyId);
    expect(newSurvey?.status).toEqual(SurveyStatus.ENDED);
  });

  it('Test payment/convert_usd_to_som API', async () => {
    await request(server)
      .get(`/api/payment/convert_usd_to_wan?usd=1`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(1465);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test payment/make_recharge API', async () => {
    await request(server)
      .get(
        `/api/payment/make_recharge?userId=${user?.uuid}&amountInUsd=10&orderId=f4f041c5-f93e-410f-b0e1-f27b61aaaf78&paymentKey=wGvaE2lKMZ7DLJOpm5Qrlqmnwn70A8PNdxbWnYzqR4gA6XyB&amount=14178.45`,
      )
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test check balance after recharge', async () => {
    const previousBalance: any = user?.wallet.balance;
    const newBalance = previousBalance + 25;
    const updatedUserWallet = await helper.getUserByEmail(
      'testuser@yopmail.com',
    );
    expect(newBalance).toEqual(updatedUserWallet?.wallet.balance);
  });

  it('Test payment/toss_payment_fail Api', async () => {
    await request(server)
      .get(
        `/api/payment/toss_payment_fail?code="BELOW_MINIMUM_AMOUNT"&message="Transaction Fail"`,
      )
      .set('Content-Type', 'application/json')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual('"BELOW_MINIMUM_AMOUNT"');
      });
  });

  afterAll(async () => {
    mockServer.server.close();
    await helper.clearDB();
    helper.stopTestWebSocketServer();
    await app.close();
  });
});
