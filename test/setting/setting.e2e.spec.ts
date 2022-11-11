import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { CoinGeckoServiceMock, ExchangeServiceMock, SotDataMock } from '../mocks/mocks';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Figrate sample test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    helper = new AppHelper(app);
    helper.startTestWebSocketServer();
    server = app.getHttpServer();
  });

  it(`Test /sample API`, async () => {
    expect(server).toBeDefined();
  });

  afterAll(async () => {
    await helper.clearDB();
    helper.stopTestWebSocketServer();
    await app.close();
  });
});
