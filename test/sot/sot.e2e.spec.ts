import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, SotDataMock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { BlockProcessor } from '../../src/modules/sot/block.processor.job';
import { JobEvents } from '../../src/modules/sot/common/sot.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate Sot test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let blockProcessor: BlockProcessor;
  let job: any = {};
  let server: any;
  let sot: any;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    blockProcessor = app.get(BlockProcessor);
    helper = new AppHelper(app);
    await helper.init();
    helper.startTestWebSocketServer();
    server = app.getHttpServer();
  });

  it(`Test Transaction Processing Function`, async () => {
    job.data = helper.getJob();
    await blockProcessor.handleBlock(job).then((result) => {
      expect(result).toEqual(JobEvents.Completed);
    });
  });


  it('Test sot/get_sot_list API', async () => {
    sot = {
      name: 'SoT IRL00002 - The Book of Kells and Trinity College',
      city: 'Dublin',
      country: 'Ireland',
      longitude: -6.256737186,
      latitude: 53.34401637,
      distance: 0
    };
    await request(server)
      .get(`/api/sot/sot_list?search=&filter=sorted&longitude=-6.256737186&latitude=53.34401637`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { uuid, ...newBody } = body.data[0];
        expect(newBody).toEqual(sot);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    helper.stopTestWebSocketServer();
    await app.close();
  });

});
