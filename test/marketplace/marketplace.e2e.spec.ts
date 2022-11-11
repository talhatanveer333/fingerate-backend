import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, S3Mock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { AvatarItem } from '../../src/modules/marketplace/avataritem.entity';
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

describe('Fingerate Marketplace test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let item: AvatarItem;
  let item1: AvatarItem;

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
    item = await helper.createAvatarItem(AvatarColorEnum.BLACK);
    server = app.getHttpServer();
  });

  it('Test marketplace/items API', async () => {
    // const updatedItem = { ...item, favourite: false,image: `https://fingerate-test-media.s3.testregion.amazonaws.com/${item.item_name}_${item.color}.png` };
    const updatedItem = {
      ...item,
      favourite: false,
      image: `2022-08-29T09:43:03.528Z_xHsUyWI.png`,
    };
    const expectedItems = [updatedItem];
    await request(server)
      .get(`/api/marketplace/items`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(body.data).toEqual(expectedItems);
      });
  });

  it('Test marketplace/item_colors/:item_name API', async () => {
    const expectedItems = [
      {
        category: AvatarCategoryEnum.HAIRS,
        gender: AvatarGenderEnum.MALE,
        item_name: AvatarItemNameEnum.MALELONGHAIRS,
        color: AvatarColorEnum.BLACK,
        status: AvatarStatusEnum.ACTIVE,
        price: 10,
        createdAt: item.createdAt,
        uuid: item.uuid,
        image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
      },
    ];

    await request(server)
      .get(`/api/marketplace/item_colors/${item.item_name}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
        expect(body.data).toEqual(expectedItems);
      });
  });

  it('Test marketplace/virtual_try_items API', async () => {
    item1 = await helper.createAvatarItem(AvatarColorEnum.BLUE);
    const expected = {
      MalelongHairs: ['Black', 'Blue'],
      MalekoreanHairs: [],
      MaleShortHairs: [],
      FeMalelongHairs: [],
      MaleHood: [],
      FeMaleMediumHairs: [],
      FeMaleShortHairs: [],
      Maletshirt: [],
      Malelongslevestshirt: [],
      FeMalessleveslesstop: [],
      FeMalesslevesstop: [],
      FeMalecoat: [],
      MaleupperShort: [],
      Malelowershort: [],
      Malepent: [],
    };
    await request(server)
      .get(`/api/marketplace/virtual_try_items`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(async ({ body }) => {
        expect(body.data).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test marketplace/add_cart_item API', async () => {
    await request(server)
      .post(`/api/marketplace/add_cart_item`)
      .send({
        items: [
          {
            item_name: item.item_name,
            color: item.color,
          },
          {
            item_name: item1.item_name,
            color: item1.color,
          },
        ],
      })
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test marketplace/cart_item API', async () => {
    const expected = {
      category: AvatarCategoryEnum.HAIRS,
      gender: AvatarGenderEnum.MALE,
      item_name: AvatarItemNameEnum.MALELONGHAIRS,
      color: AvatarColorEnum.BLACK,
      status: AvatarStatusEnum.ACTIVE,
      price: 10,
      image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
    };
    await request(server)
      .get(`/api/marketplace/cart_item`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        const { uuid, createdAt, ...received } = body.data[0];
        expect(received).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test marketplace/delete_cart_item API', async () => {
    await request(server)
      .delete(`/api/marketplace/delete_cart_item/${item1.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test marketplace/checkout API', async () => {
    const user = await helper.getUserByEmail('testuser@yopmail.com');
    await request(server)
      .post(`/api/marketplace/checkout`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(async ({ body }) => {
        const order = await helper.getOrders();
        expect(order.length).toEqual(1);
        expect(order[0].user.wallet.balance).toEqual(4990);
        expect(order[0].user.uuid).toEqual(user?.uuid);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test user/item_collection API', async () => {
    const expected = {
      FeMaleMediumHairs: [],
      FeMaleShortHairs: [],
      FeMalecoat: [],
      FeMalelongHairs: [],
      FeMalessleveslesstop: [],
      FeMalesslevesstop: [],
      MaleHood: [],
      MaleShortHairs: [],
      MalekoreanHairs: [],
      MalelongHairs: ['Black'],
      Malelongslevestshirt: [],
      Malelowershort: [],
      Malepent: [],
      Maletshirt: [],
      MaleupperShort: [],
    };
    await request(server)
      .get(`/api/user/item_collection`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
