import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AdminHelper } from '../admin.helper';
import { FAQ } from '../../src/modules/faq/faq.entity';
import { MailService } from '../../src/utils/mailer/mail.service';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock } from '../mocks/mocks';
import { S3Service } from '../../src/utils/s3/s3.service';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { AppModule } from '../../src/modules/main/app.module';
import { ResponseMessage } from '../../src/utils/enum';
import { AvatarItem } from '../../src/modules/marketplace/avataritem.entity';
import { User } from '../../src/modules/user';
import { AvatarCategoryEnum, AvatarItemNameEnum } from '../../src/modules/marketplace/common/marketplace.enums';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin avatar test', () => {
  let app: INestApplication;
  let helper: AdminHelper;
  let server: any;
  let avatar: AvatarItem;
  let user: User;

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
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    helper = new AdminHelper(app);
    await helper.init();
    user = await helper.createUser('testUser123@fingerate.com');
    server = app.getHttpServer();
  });

  it('Test admin/avatar/create API', async () => {
    const avatarPayload = {
      category: 'Hairs',
      gender: 'Male',
      item_name: 'MalelongHairs',
      price: 1,
      color: 'Blue',
      status: 'Active',
    };
    await request(server)
      .post(`/api/admin/avatar/create`)
      .set('Authorization', helper.getAccessToken())
      .send(avatarPayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.CREATED_SUCCESSFULLY);
        avatar = body.avatar;
        avatar.image = '2022-08-29T09:43:03.528Z_xHsUyWI.png';
      });
  });

  it('Test admin/avatar/:uuid API', async () => {
    const updatedAvatarPayload = {
      category: 'Hairs',
      gender: 'Male',
      item_name: 'MalelongHairs',
      price: 10,
      color: 'Blue',
      status: 'Active',
    };
    await request(server)
      .put(`/api/admin/avatar/${avatar.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .send(updatedAvatarPayload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
    avatar.price = updatedAvatarPayload.price;
  });

  it('Test admin/avatar/list API', async () => {
    const expected = {
      avatars: [
        {
          uuid: avatar.uuid,
          category: 'Hairs',
          item_name: 'MalelongHairs',
          price: 10,
          status: 'Active',
        },
      ],
      meta: {
        total_count: 1,
      },
    };
    await request(server)
      .get(`/api/admin/avatar/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        delete body.data.avatars[0].createdAt;
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/avatar/id/:uuid`, async () => {
    const expected = avatar;
    await request(server)
      .get(`/api/admin/avatar/id/${avatar.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it('Test admin/avatar/user_avatar/list API', async () => {
    const expected = {
      usersAvatar: [
        {
          uuid: user.uuid,
          nickName: null,
          email: 'testUser123@fingerate.com',
          gender: 'female',
          hair: 'long',
          top: 'nosleves',
          bottom: '',
          shoes: 'long',
          skin: 'white'
        },
      ],
      meta: {
        total_count: 1,
      },
    };
    await request(server)
      .get(`/api/admin/avatar/user_avatar/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/avatar/user_avatar/id/:uuid`, async () => {
    let expected = {
      email: 'testUser123@fingerate.com',
      nickname: null,
      gender: 'female',
      hair: 'long',
      top: 'nosleves',
      bottom: '',
      shoes: 'long',
      skin: 'white'
    }
    await request(server)
      .get(`/api/admin/avatar/user_avatar/id/${user.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        let { uuid, ...res } = body.data
        expect(res).toEqual(expected);
      })
  })
  
  it('Test admin/avatar/user_wishlist/:uuid API', async () => {
    const wishListItem=await helper.addAvatarInWishList(user);
    const expected = {
      userWishlist: [
        {
          createdAt: wishListItem.createdAt,
          category: AvatarCategoryEnum.HAIRS,
          item_name: AvatarItemNameEnum.MALELONGHAIRS,
          price: 10
        },
      ],
      meta: {
        total_count: 1,
      },
    };
    await request(server)
      .get(`/api/admin/avatar/user_wishlist/`+ user.uuid)
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
