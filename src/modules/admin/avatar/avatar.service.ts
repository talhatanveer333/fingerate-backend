import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AvatarItem } from '../../marketplace/avataritem.entity';
import moment from 'moment';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { FindOperator, Repository, Not } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { AvatarDTO, AvatarListDTO, UsersAvatarListDTO } from './common/avatar.dto';
import { IAvatarListFilters, IUserAvatar, IUsersAvatarListFilters } from './common/avatar.type';
import {
  AvatarCategoryEnum,
  AvatarGenderEnum,
  AvatarItemNameEnum,
} from '../../marketplace/common/marketplace.enums';
import { S3Service } from '../../../utils/s3/s3.service';
import { User } from '../../../modules/user/user.entity';
import { UserAvatar } from '../../../modules/user/useravatar.entity';
import { LoggerService } from './../../../utils/logger/logger.service';
import { UsersService } from '../../user/user.service';
@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(AvatarItem)
    private readonly avatarItemRepository: Repository<AvatarItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Service: S3Service,
    @InjectRepository(UserAvatar)
    private readonly userAvatarRepository: Repository<UserAvatar>,
    private readonly loggerService: LoggerService,
    private readonly userService: UsersService,
  ) { }

  /**
   * Check Avatar Input
   *
   * @params payload
   */
  async checkAvatarInput(payload: AvatarDTO, uuid?: string) {
    let isValidAvatar = false;
    if (payload.gender === AvatarGenderEnum.MALE) {
      if (
        payload.category === AvatarCategoryEnum.HAIRS &&
        [
          AvatarItemNameEnum.MALELONGHAIRS.toString(),
          AvatarItemNameEnum.MALEKOREANHAIRS.toString(),
          AvatarItemNameEnum.MALESHORTHAIRS.toString(),
        ].includes(payload.item_name)
      ) {
        isValidAvatar = true;
      }
      if (
        payload.category === AvatarCategoryEnum.TOPS &&
        [
          AvatarItemNameEnum.MALEHOOD.toString(),
          AvatarItemNameEnum.MALETSHIRT.toString(),
          AvatarItemNameEnum.MALELONGSLEVESTSHIRT.toString(),
        ].includes(payload.item_name)
      ) {
        isValidAvatar = true;
      }
      if (
        payload.category === AvatarCategoryEnum.BOTTOMS &&
        [
          AvatarItemNameEnum.MALEUPPERSHORT.toString(),
          AvatarItemNameEnum.MALELOWERSHORT.toString(),
          AvatarItemNameEnum.MALEPENT.toString(),
        ].includes(payload.item_name)
      ) {
        isValidAvatar = true;
      }
    }
    if (payload.gender === AvatarGenderEnum.FEMALE) {
      if (
        payload.category === AvatarCategoryEnum.HAIRS &&
        [
          AvatarItemNameEnum.FEMALELONGHAIRS.toString(),
          AvatarItemNameEnum.FEMALEMEDIUMHAIRS.toString(),
          AvatarItemNameEnum.FEMALESHORTHAIRS.toString(),
        ].includes(payload.item_name)
      ) {
        isValidAvatar = true;
      }
      if (
        payload.category === AvatarCategoryEnum.TOPS &&
        [
          AvatarItemNameEnum.FEMALESSLEVESLESSTOP.toString(),
          AvatarItemNameEnum.FEMALESSLEVESSTOP.toString(),
          AvatarItemNameEnum.FEMALECOAT.toString(),
        ].includes(payload.item_name)
      ) {
        isValidAvatar = true;
      }
    }
    if (!isValidAvatar) {
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_INPUT_NOT_CONSISTENT,
          message: ResponseMessage.AVATAR_INPUT_NOT_CONSISTENT,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const where: {
      item_name: string;
      color: string;
      uuid?: FindOperator<string>;
    } = { item_name: payload.item_name, color: payload.color };
    if (uuid) {
      where.uuid = Not(uuid);
    }
    const isAvatarAlreadyExist = await this.avatarItemRepository.findOne({
      where,
    });
    if (isAvatarAlreadyExist) {
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_ALREADY_EXISTS,
          message: ResponseMessage.AVATAR_ALREADY_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
  }

  /**
   * Create Avatar
   *
   * @params payload
   * @returns avatar
   */
  public async createAvatar(payload: AvatarDTO) {
    await this.checkAvatarInput(payload);
    const avatar = new AvatarItem().fromDto(payload);
    await this.avatarItemRepository.save(avatar);
    return avatar;
  }

  /**
   * Update Avatar
   *
   * @params payload
   * @returns avatar
   */
  public async updateAvatar(uuid: string, payload: AvatarDTO) {
    const avatar = await this.avatarItemRepository.findOne({ where: { uuid } });
    if (!avatar)
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_DOES_NOT_EXISTS,
          message: ResponseMessage.AVATAR_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    await this.checkAvatarInput(payload, uuid);
    avatar.fromDto(payload);
    await this.avatarItemRepository.save(avatar);
    return avatar;
  }

  /**
   * Get All Avatar
   *
   * @params query
   * @params paginationOption
   * @returns avatars
   */
  public async getAllAvatars(
    queryOptions: AvatarListDTO,
    paginationOption: IPaginationOptions,
  ) {
    const format: IAvatarListFilters = {
      item_name: queryOptions.item_name
        ? ` AND "item_name"::text ILIKE '%${queryOptions.item_name}%'`
        : '',
      category: queryOptions.category
        ? ` AND "category" = '${queryOptions.category}'`
        : '',
      startDate: queryOptions.start_date
        ? ` AND A."createdAt" >= ${moment.unix(queryOptions.start_date).unix()}`
        : '',
      endDate: queryOptions.end_date
        ? ` AND A."createdAt" <= ${moment.unix(queryOptions.end_date).unix()}`
        : '',
    };
    const filter = Object.values(format).join('');
    const sql = `SELECT
                  A.uuid,
                  A."createdAt",
                  A.category,
                  A.item_name,
                  A.price,
                  A.status
                  FROM 
                  avatars_items A
                  WHERE
                    1=1 ${filter}
                    ORDER BY A."createdAt" DESC
                    LIMIT $1 OFFSET $2`;
    const avatars = await this.avatarItemRepository.query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);
    const count_sql = `SELECT
              CAST(COUNT(*) AS INTEGER) AS total_count
          FROM 
          avatars_items A
          WHERE
             1=1 ${filter}`;
    const meta = await this.avatarItemRepository.query(count_sql);
    return { avatars, meta: meta[0] };
  }


  /**
   * Get A Avatar
   *
   * @params avatarId
   * @returns avatar
   */
  public async getUserAvatarById(userId: string) {
    const data = await this.userRepository.findOne({
      where: { uuid: userId },
      relations: ['avatar']
    });

    if (!data)
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_DOES_NOT_EXISTS,
          message: ResponseMessage.AVATAR_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    const avatarJSON = JSON.parse(data.avatar.avatar);
    let response: IUserAvatar = {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickName,
      gender: avatarJSON.Avatar,
      hair: avatarJSON.Hairs,
      top: avatarJSON.Top,
      bottom: avatarJSON.Bottom,
      shoes: avatarJSON.Shoes,
      skin: avatarJSON.Skintone
    }
    return response;
  }



  /**
   * Get A Avatar
   *
   * @params avatarId
   * @returns avatar
   */
  public async getAvatarById(avatarId: string) {
    const avatar = await this.avatarItemRepository.findOne(avatarId);
    if (!avatar)
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_DOES_NOT_EXISTS,
          message: ResponseMessage.AVATAR_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    avatar.image = this.s3Service.getPublicURL(
      `avatar-items/${avatar.item_name}-${avatar.color}.png`,
    );

    return avatar;
  }

  /**
   * Get All Users Avatar
   *
   * @params query
   * @params paginationOption
   * @returns users avatars
   */
  public async getAllUsersAvatar(
    queryOptions: UsersAvatarListDTO,
    paginationOption: IPaginationOptions,
  ) {
    const format: IUsersAvatarListFilters = {
      nickName: queryOptions.nickName
        ? ` AND "nickName" LIKE '%${queryOptions.nickName}%'`
        : '',
      email: queryOptions.email
        ? ` AND "email" LIKE '%${queryOptions.email}%'`
        : '',
      item_name: queryOptions.category && queryOptions.item_name
        ? ` AND UA.avatar::json->>'${queryOptions.category}' LIKE '%${queryOptions.item_name}%' `
        : '',
    };
    const filter = Object.values(format).join('');
    const sql = `SELECT 
                  U.uuid, U."nickName", U.email,  
                  UA.avatar::json->>'Avatar' AS gender,
                  UA.avatar::json->>'Hairs' AS hair,
                  UA.avatar::json->>'Top' AS top,
                  UA.avatar::json->>'Bottom' AS bottom,
                  UA.avatar::json->>'Shoes' AS shoes,
                  UA.avatar::json->>'Skintone' AS skin
                FROM users AS U
                  JOIN user_avatars AS UA ON UA.uuid=U."avatarId"
                WHERE
                  1=1 ${filter}
                ORDER BY U."createdAt" DESC
                LIMIT $1 OFFSET $2`;
    const usersAvatar = await this.userAvatarRepository.query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);
    const count_sql = `SELECT 
                        CAST(COUNT(*) AS INTEGER) AS total_count
                      FROM users AS U
                      JOIN user_avatars AS UA ON UA.uuid=U."avatarId"
                      WHERE
                      1=1 ${filter}`;
    const meta = await this.userAvatarRepository.query(count_sql);
    return { usersAvatar, meta: meta[0] };
  }

  /**
   * Get User Wishlist
   *
   * @params paginationOption
   * @returns user wishlist
   */
  public async getUserWishlist(
    userId: string,
    paginationOption: IPaginationOptions,
  ) {
    const user = await this.userService.get(userId);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXIST,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const sql = `SELECT 
                    UW."createdAt", A.category, A.item_name, A.price
                FROM users_items_wishlists UW
                JOIN avatars_items A ON A.uuid=UW."itemId"
                WHERE 
                  UW."userId"='${userId}' 
                ORDER BY UW."createdAt" DESC
                LIMIT $1 OFFSET $2`;
    const userWishlist = await this.avatarItemRepository.query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);
    const count_sql = `SELECT 
                        CAST(COUNT(*) AS INTEGER) AS total_count
                      FROM users_items_wishlists UW
                      JOIN avatars_items A ON A.uuid=UW."itemId"
                      WHERE 
                        UW."userId"='${userId}'`;
    const meta = await this.avatarItemRepository.query(count_sql);
    return { userWishlist, meta: meta[0] };
  }
}
