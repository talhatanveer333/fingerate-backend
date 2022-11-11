import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MarketplaceService } from '../../modules/marketplace/marketplace.service';
import { Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { User } from '../user/user.entity';
import { UserItemWishlist } from './itemwishlist.entity';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { AvatarStatusEnum } from '../../modules/marketplace/common/marketplace.enums';
import { AvatarItem } from 'modules/marketplace/avataritem.entity';
import { S3Service } from '../../utils/s3/s3.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(UserItemWishlist)
    private readonly userItemWishlistRepository: Repository<UserItemWishlist>,
    private readonly marketPlaceService: MarketplaceService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * add Item To User Wishlist
   *
   *@currentUser user
   * @param uuid
   * @param user
   */
  async addItemToUserWishlist(uuid: string, user: User) {
    try {
      const avatarItem = await this.marketPlaceService.getAvatarItemById(uuid);
      const userItemWishlist = await this.userItemWishlistRepository.findOne({
        where: { userId: user, itemId: avatarItem },
      });
      if (userItemWishlist) {
        throw new HttpException(
          {
            statusCode: ResponseCode.USER_AVATAR_ITEM_ALREADY_ADDED_TO_WISHLIST,
            message: ResponseMessage.USER_AVATAR_ITEM_ALREADY_ADDED_TO_WISHLIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      const newUserItemWishlist = new UserItemWishlist().fromDto(
        avatarItem,
        user,
      );
      await this.userItemWishlistRepository.save(newUserItemWishlist);
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get User wishlists with pagination
   *
   *@paginationOption IPaginationOptions
   *@currentUser user
   * @returns wishlists
   */
  public async getUserWishlist(
    paginationOption: IPaginationOptions,
    user: User,
  ) {
    const wishlists: any = await this.paginate(paginationOption, {
      userId: user,
      itemId: {
        status: AvatarStatusEnum.ACTIVE,
      },
    });
    const avatarItems: AvatarItem[] = [];
    wishlists.items.map(async (m) => {
      m.itemId.image = this.s3Service.getPublicURL(
        `avatar-items/${m.itemId.item_name}-${m.itemId.color}.png`,
      );
      m.itemId.favourite = true;
      avatarItems.push(m.itemId);
    });
    wishlists.items = avatarItems;
    return {
      wishlists,
    };
  }

  /** delete All User Wishlist
   *
   * @CurrentUser user
   * @returns
   */
  public async deleteUserWishlist(user: User): Promise<void> {
    try {
      await this.userItemWishlistRepository.delete({ userId: user });
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * get wishlist of user by itemId and userId 
   * 
   * @param itemId
   * @param userId
   * @returns
   */
  public async getWishList(
    itemId: string,
    userId: string,
  ): Promise<UserItemWishlist> {
    const wishList = await this.userItemWishlistRepository.findOne({
      where: {
        userId: userId,
        itemId: itemId,
      },
    });
    if (!wishList) {
      throw new HttpException(
        {
          statusCode: ResponseCode.WISHLIST_ITEM_DOES_NOT_EXIST,
          message: ResponseMessage.WISHLIST_ITEM_DOES_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return wishList;
  }

  /**
   * Delete Item From WisList by itemId and userId
   * @param itemId
   * @param userId
   * @returns
   */
  public async deleteFromWishlist(
    itemId: string,
    userId: string,
  ): Promise<void> {
    await this.getWishList(itemId, userId);
    await this.userItemWishlistRepository.delete({
      itemId: { uuid: itemId },
      userId: { uuid: userId },
    });
    return;
  }

  /**
   * Paginate User wishlist 
   *
   * @param options
   * @param condition
   * @param relations
   * @returns wishlists
   */
  private async paginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<UserItemWishlist>> {
    return paginate<UserItemWishlist>(
      this.userItemWishlistRepository,
      options,
      {
        order: { createdAt: 'DESC' },
        where: condition,
        relations: ['itemId'],
      },
    );
  }
}
