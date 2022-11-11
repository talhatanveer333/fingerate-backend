import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { AvatarItem } from '../../src/modules/marketplace/avataritem.entity';
import { ResponseMessage } from '../../src/utils/enum';
import {
  AvatarCategoryEnum,
  AvatarColorEnum,
  AvatarGenderEnum,
  AvatarItemNameEnum,
  AvatarStatusEnum,
} from '../../src/modules/marketplace/common/marketplace.enums';
import { S3Service } from '../../src/utils/s3/s3.service';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate Wishlist test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let avatarItem: AvatarItem;
  let avatarItemId: string;

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
    avatarItem = await helper.createAvatarItem(AvatarColorEnum.BLACK);
    avatarItemId = avatarItem.uuid;
    server = app.getHttpServer();
  });

  it('Test wishlist/add_item/:uuid API', async () => {
    await request(server)
      .post(`/api/wishlist/add_item/${avatarItemId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test wishlist/user_wishlist?page=1&pageSize:10 API', async () => {
    const expected = {
      items: [
        {
          category: AvatarCategoryEnum.HAIRS,
          gender: AvatarGenderEnum.MALE,
          item_name: AvatarItemNameEnum.MALELONGHAIRS,
          price: 10,
          color: AvatarColorEnum.BLACK,
          status: AvatarStatusEnum.ACTIVE,
          favourite: true,
          image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
        },
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    };
    await request(server)
      .get(`/api/wishlist/user_wishlist?page=1&pageSize:10`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        delete body.data.wishlists.items[0].uuid;
        delete body.data.wishlists.items[0].createdAt;
        expect(body.data.wishlists).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test wishlist/delete_wishlist_item/:uuid API', async () => {
    await request(server)
      .delete(`/api/wishlist/delete_wishlist_item/${avatarItemId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
