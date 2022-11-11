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

describe('Fingerate Admin Reward test', () => {
    let app: INestApplication;
    let helper: AppHelper;
    let adminHelper: AdminHelper;
    let server: any;
    let createdReward;
    let createdUser;

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
        helper = new AppHelper(app);
        await helper.init();
        helper.startTestWebSocketServer();
        adminHelper = new AdminHelper(app);
        await adminHelper.init();
        const { reward, user } = await adminHelper.createReward();
        createdReward = reward;
        createdUser = user;
        server = app.getHttpServer();
    });

    it(`Test admin/reward/user_history`, async () => {
        const expected = {
            date: '20/10/2022',
            email: 'user@fingerate.com',
            nickName: null,
            amount: 6500,
            admin_email: 'admin@fingerate.com'
        }
        await request(server)
            .get(`/api/admin/reward/user_history`)
            .set('Authorization', adminHelper.getAccessToken())
            .expect(200)
            .expect(({ body }) => {
                const { records } = body.data;
                const { uuid, ...otherData } = records[0];
                expect(otherData).toEqual(expected)
            });
    });

    it(`Test admin/reward/search_user/:email`, async () => {
        const expected = {
            nickName: null,
            email: 'user@fingerate.com'
        }
        await request(server)
            .get(`/api/admin/reward/search_user/user@fingerate.com`)
            .set('Authorization', adminHelper.getAccessToken())
            .expect(200)
            .expect(({ body }) => {
                const { uuid, ...otherData } = body.data[0];
                expect(otherData).toEqual(expected);
            });
    });

    it(`Test admin/reward/save`, async () => {
        const payload = {
            uuid: createdUser.uuid,
            type: "attendance",
            som: 5,
            reason: "I am the reason"
        }
        await request(server)
            .post(`/api/admin/reward/save`)
            .set('Authorization', adminHelper.getAccessToken())
            .send(payload)
            .expect(200)
            .expect(({ body }) => {
                expect(body.message).toEqual(ResponseMessage.SUCCESS)
            });
    });

    afterAll(async () => {
        await helper.clearDB();
        await adminHelper.clearDB();
        helper.stopTestWebSocketServer();
    });



});
