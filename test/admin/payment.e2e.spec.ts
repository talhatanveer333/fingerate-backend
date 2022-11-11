import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, MockBullQueue, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { MailService } from '../../src/utils/mailer/mail.service';
import { S3Service } from '../../src/utils/s3/s3.service';
import { QueueName } from '../../src/modules/worker/common/worker.enums';
import { getQueueToken } from '@nestjs/bull';
import { WorkerProcessor } from '../../src/modules/worker/worker.processor';
import { AdminHelper } from '../admin.helper';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate Admin Payment test', () => {
    let app: INestApplication;
    let helper: AppHelper;
    let adminHelper: AdminHelper;
    let server: any;
    let surveyId: string;
    let sotId: string;
    let workerProcessor: WorkerProcessor;

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
            .overrideProvider(getQueueToken(QueueName.DEFAULT))
            .useValue(MockBullQueue)
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
        adminHelper = new AdminHelper(app);
        await adminHelper.init();
        server = app.getHttpServer();
    });

    it('Test payment/make_survey_payment/:surveyId API', async () => {
        const user = await helper.getUserByEmail('testuser@yopmail.com');
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

    it(`Test admin/payment/cumulative_statistics GET API`, async () => {
        await request(server)
            .get('/api/admin/payment/cumulative_statistics')
            .set('Authorization', adminHelper.getAccessToken())
            .expect(200)
            .expect(({ body }) => {
                expect(body.message).toEqual(ResponseMessage.SUCCESS);
                expect(body).toBeDefined()
            });
        expect(server).toBeDefined();
    });

    it('Test admin/payment/graph_stats', async () => {
        await request(server)
            .get('/api/admin/payment/graph_stats')
            .set('Authorization', adminHelper.getAccessToken())
            .expect(200)
            .expect(({ body }) => {
                expect(body).toBeDefined()
            })
    })

    afterAll(async () => {
        await helper.clearDB();
        await adminHelper.clearDB();
        helper.stopTestWebSocketServer();
    });



});
