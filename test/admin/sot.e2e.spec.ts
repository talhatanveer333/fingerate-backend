import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/modules/main/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminHelper } from '../admin.helper';
import request from 'supertest';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { MailerMock, LoggerMock, SotDataMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { BlockProcessor } from '../../src/modules/sot/block.processor.job';
import { JobEvents } from '../../src/modules/sot/common/sot.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ResponseMessage } from '../../src/utils/enum';
import { uuid } from 'aws-sdk/clients/customerprofiles';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin sot test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let blockProcessor: BlockProcessor;
  let job: any = {};
  let server: any;
  let sotId: uuid;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    helper = new AdminHelper(app);
    blockProcessor = app.get(BlockProcessor);
    await helper.init();
    server = app.getHttpServer();
  });

  it(`Process a block`, async () => {
    job.data = helper.getJob();
    await blockProcessor.handleBlock(job).then((result) => {
      expect(result).toEqual(JobEvents.Completed);
    });
  });

  it(`Test admin/sot/list API`, async () => {
    const expected = {
      sots: [
        {
          name: 'SoT IRL00002 - The Book of Kells and Trinity College',
          address: 'Dublin Ireland',
          uniqueId: 'IRL00002',
          createdAt: 1678953,
          owner: '0xsdfsd6fsdf78s5fsdfsdfsdf8s6df86sdfs',
        },
      ],
      meta: { total_count: 1 },
    };
    await request(server)
      .get(`/api/admin/sot/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        sotId = body.data.sots[0].uuid;
        const { uuid, ...updatedSotData } = body.data.sots[0];
        body.data.sots[0] = updatedSotData;
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test /admin/sot/id/:uuid`, async () => {
    const expected = {
      name: 'SoT IRL00002 - The Book of Kells and Trinity College',
      address: 'Dublin Ireland',
      uniqueId: 'IRL00002',
      createdAt: 1678953,
      owner: '0xsdfsd6fsdf78s5fsdfsdfsdf8s6df86sdfs',
    };
    await request(server)
      .get(`/api/admin/sot/id/${sotId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/sot/statistics GET API`, async () => {
    const ExpectedResponse = {
      totalSot: 1,
      sotGraphData: [
        {
          no_sots: 1,
        },
      ],
    };
    await request(server)
      .get('/api/admin/sot/statistics?start_date=1642373577&end_date=1665978777')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        const { sot_year, sot_month, ...result } = body.data.sotGraphData[0];
        body.data.sotGraphData[0] = result;
        expect(body.data.sotGraphData[0]).toEqual(
          ExpectedResponse.sotGraphData[0],
        );
      });
    expect(server).toBeDefined();
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
