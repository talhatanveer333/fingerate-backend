import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getConnection, In, QueryRunner, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum/index';
import { AvatarItem } from './avataritem.entity';
import {
  AvatarItemNameEnum,
  AvatarStatusEnum,
} from './common/marketplace.enums';
import { AddItemsToCartDto, ItemsQueryDto } from './common/marketplace.dto';
import { Cart } from './cart.entity';
import { CartItem } from './cartitem.entity';
import { User } from '../user/user.entity';
import { Order } from './order.entity';
import { OrderItem } from './orderitem.entity';
import { PaymentService } from '../payment/payment.service';
import { PaymentType } from '../payment/common/payment.enums';
import { UsersService } from '../user/user.service';
import { S3Service } from '../../utils/s3/s3.service';
import { AvatarItemImage } from './common/avataritem.type';
import { StreakSize } from '../../modules/event/common/event.enums';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(AvatarItem)
    private readonly avatarItemRepository: Repository<AvatarItem>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly paymentService: PaymentService,
    private readonly s3Service: S3Service,
    private readonly userService: UsersService,
  ) {}

  /** get Avatar Item by uuid
  * 
  * @param uuid
  * @param inquiryParam
  * @returns avatarItem
  */
  async getAvatarItemById(uuid: string): Promise<AvatarItem> {
    const avatarItem = await this.avatarItemRepository.findOne({
      uuid,
      status: AvatarStatusEnum.ACTIVE,
    });
    if (!avatarItem) {
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_ITEM_NOT_EXIST,
          message: ResponseMessage.AVATAR_ITEM_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return avatarItem;
  }

  /**  get wishlist item of active status and with filters
   *
   * @param  query ItemsQueryDto
   * @returns items
   */
  public async getMarketItems(query: ItemsQueryDto) {
    let filter = ` WHERE ai."status" = '${AvatarStatusEnum.ACTIVE}'`;
    if (query.category) {
      filter += ` AND ai."category" = '${query.category}'`;
    }
    let sql = `
      SELECT 
        ai."uuid",
        ai."category",
        ai."gender",
        ai."price",
        ai."status",
        ai."item_name",
        ai."color",
        ai."createdAt",
        CASE WHEN (uiw."itemId" = ai."uuid") THEN true else false END "favourite"
      FROM
        avatars_items ai
      LEFT JOIN users_items_wishlists uiw ON uiw."itemId" = ai."uuid"
      ${filter};`;
    const items = await this.avatarItemRepository.query(sql);
    items.map((item) => {
      item.image = this.s3Service.getPublicURL(
        `avatar-items/${item.item_name}-${item.color}.png`,
      );
    });
    return items;
  }

  /**
   * Get colors of item by item name
   *
   * @param item_name
   * @returns items
   */
  public async getColorsByItemName(item_name: string) {
    let where: { status: string; item_name: string } = {
      status: AvatarStatusEnum.ACTIVE,
      item_name: item_name,
    };
    const items: AvatarItemImage[] = await this.avatarItemRepository.find({
      where,
    });
    items.map((i) => {
      i.image = this.s3Service.getPublicURL(
        `avatar-items/${i.item_name}-${i.color}.png`,
      );
    });

    return items;
  }

  /**
   * Validate Items
   * @param items AddItemsToCartDto
   * @returns itemIds
   */
  public async validateItems(items: AddItemsToCartDto): Promise<string[]> {
    let itemIds = [];
    for (const item of items.items) {
      const avatarItem = await this.avatarItemRepository.findOne({
        where: {
          item_name: item.item_name,
          color: item.color,
          status: AvatarStatusEnum.ACTIVE,
        },
      });
      if (!avatarItem) {
        throw new HttpException(
          {
            statusCode: ResponseCode.AVATAR_ITEM_NOT_EXIST,
            message: ResponseMessage.AVATAR_ITEM_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      itemIds.push(avatarItem.uuid);
    }
    return itemIds;
  }

  /**
  * 
  * add item to user cart
  * 
  * @param items AddItemToCartDto
  * @currentUser user 
  * @return void
  */
  public async addCartItem(
    items: AddItemsToCartDto,
    user: User,
  ): Promise<void> {
    try {
      const itemIds = await this.validateItems(items);
      const notPurchaseAvatarItem: AvatarItem[] =
        await this.userService.getUserNotPurchedItems(itemIds, user);
      notPurchaseAvatarItem.map(async (m) => {
        const cartItem = await this.cartItemRepository.findOne({
          where: { itemId: m, cartId: user.cart },
        });
        if (!cartItem) {
          const newcartItem = new CartItem().fromDto(m, user.cart);
          await this.cartItemRepository.save(newcartItem);
        }
      });
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * get User Cart Items
   *
   *@currentUser user
   * @returns avatarItems , total
   */
  public async getUserCartItems(
    user: User,
  ): Promise<{ total: number; avatarItems: Array<AvatarItem> }> {
    const cartItem: any = await this.cartItemRepository.find({
      where: {
        cartId: user.cart,
        itemId: {
          status: AvatarStatusEnum.ACTIVE,
        },
      },
      relations: ['itemId'],
    });
    const avatarItems: AvatarItem[] = [];
    cartItem.map(async (m) => {
      m.itemId.image = this.s3Service.getPublicURL(
        `avatar-items/${m.itemId.item_name}-${m.itemId.color}.png`,
      );
      avatarItems.push(m.itemId);
    });
    let totalAmount = avatarItems.reduce(
      (sum, item) => sum + parseFloat(item.price.toString()),
      0,
    );
    return {
      avatarItems,
      total: totalAmount,
    };
  }

  /**
   * Delete Item From Wishlist by itemId and userId
   * @param itemId
   * @param userId
   * @returns void
   */
  public async deleteItemFromUsercart(
    itemId: string,
    userId: User,
  ): Promise<void> {
    try {
      const cartItem = await this.cartItemRepository.findOne({
        where: { cartId: userId.cart, itemId: itemId },
        relations: ['itemId'],
      });
      if (!cartItem) {
        throw new HttpException(
          {
            statusCode: ResponseCode.AVATAR_ITEM_NOT_EXIST_IN_CART,
            message: ResponseMessage.AVATAR_ITEM_NOT_EXIST_IN_CART,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.cartItemRepository.delete({
        cartId: { uuid: userId.cart.uuid },
        itemId: { uuid: itemId },
      });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** delete all User cart Item
   *
   * @CurrentUser user
   * @returns void
   */
  public async deleteUsercartItem(user: User): Promise<void> {
    try {
      await this.cartItemRepository.delete({ cartId: user.cart });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** initialize user Cart 
   *
   * @param user
   * @returns void
   */
  public async initializeCart(user: User): Promise<void> {
    const cart: Cart = new Cart();
    user.cart = await this.cartRepository.save(cart);
    await this.userService.save(user);
    return;
  }

  /**
   * Checkout will check item and will start transactions
   * 
   * @param user
   * @returns 
   */
  public async checkout(user: User) {
    try {
      const cart = user.cart;
      if (!cart) {
        throw new HttpException(
          {
            statusCode: ResponseCode.CART_NOT_EXIST,
            message: ResponseMessage.CART_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const { total, avatarItems } = await this.getUserCartItems(user);
      if (!avatarItems.length) {
        throw new HttpException(
          {
            statusCode: ResponseCode.CART_IS_EMPTY,
            message: ResponseMessage.CART_IS_EMPTY,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (user.wallet.balance < total) {
        throw new HttpException(
          {
            statusCode: ResponseCode.BALANCE_LESS_THAN_REQUIRED,
            message: ResponseMessage.BALANCE_LESS_THAN_REQUIRED,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.checkoutTransaction(total, avatarItems, user, cart.uuid);
    } catch (error) {
      throw error;
    }
  }
  /**
   * Checkout Transaction start
   * @param total
   * @param avatarItems
   * @param user
   * @param cartId
   * @returns
   */
  public async checkoutTransaction(
    total: number,
    avatarItems: AvatarItem[],
    user: User,
    cartId: string,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // Create Order
        const order = await this.createOrder(total, user, queryRunner);
        // Create Order item
        await this.createOrderItems(order, avatarItems, queryRunner);
        // Make Payment
        await this.paymentService.createPayment(
          user,
          total,
          PaymentType.PURCHASE,
          queryRunner,
          null,
          order,
        );
        // Deduct Amount From User Wallet
        await this.paymentService.deductPaymentFromUserWallet(
          user,
          total,
          queryRunner,
        );
        // Remove Cart Items
        const itemIds = avatarItems.map((item) => item.uuid);
        await this.deleteCartItems(cartId, itemIds, queryRunner);
        // Save In ItemCollection
        await this.userService.saveItemCollection(
          avatarItems,
          user,
          queryRunner,
        );
        const respectPoints = this.getRespectLevelPointsOfUser(total);
        user.respectLevelPoints += respectPoints;
        user.respectLevel = this.userService.getUserRespectLevel(user);
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(err);
      } finally {
        await queryRunner.release();
        resolve();
      }
    });
  }

  /**
   * Get Respect Level Points From Som Amount
   * @param som
   * @returns points
   */
  private getRespectLevelPointsOfUser(som: number) {
    let points = 0;
    points = som / StreakSize.HUNDRED;
    const remainder = som % StreakSize.HUNDRED;
    if (remainder !== 0) {
      points = Math.floor(points);
    }
    return points;
  }

  /**
   * Create new Order transaction
   * @param totalAmount
   * @param user
   * @param queryRunner
   * @returns
   */
  public async createOrder(
    totalAmount: number,
    user: User,
    queryRunner: QueryRunner,
  ) {
    return new Promise<Order>(async (resolve, reject) => {
      try {
        const order = new Order();
        order.user = user;
        order.totalAmount = totalAmount;
        const newOrder = await queryRunner.manager.save(order);
        resolve(newOrder);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create new Order Items transaction
   * @param order
   * @param avatarItems
   * @param queryRunner
   * @returns
   */
  public async createOrderItems(
    order: Order,
    avatarItems: AvatarItem[],
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        let orderItems: OrderItem[] = [];
        for (const item of avatarItems) {
          const orderItem = new OrderItem().fromDto(item, order);
          orderItems.push(orderItem);
        }
        await queryRunner.manager.save(orderItems);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete Cart items transaction
   * @param cartId
   * @param itemIds[]
   * @param queryRunner
   * @returns
   */
  public async deleteCartItems(
    cartId,
    itemIds: string[],
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await queryRunner.manager.delete(CartItem, {
          itemId: { uuid: In(itemIds) },
          cartId: { uuid: cartId },
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   *Return All Market Place Items
   * @returns resObj
   */
  public async virtualTryItems() {
    let sql = `SELECT 
    ai."item_name",
    array_agg(ai."color") AS colors
    FROM avatars_items ai 
    WHERE ai."status" = '${AvatarStatusEnum.ACTIVE}'
    GROUP BY item_name    
    `;
    let items = await getConnection().query(sql);

    let resObj = {};
    if (items.length) {
      items.map((item: { item_name: string; colors: Array<string> }) => {
        resObj[`${item.item_name}`] = item.colors;
      });
    }
    for (let item_name in AvatarItemNameEnum) {
      if (!resObj[AvatarItemNameEnum[item_name]]) {
        resObj[AvatarItemNameEnum[item_name]] = [];
      }
    }
    return resObj;
  }
}
