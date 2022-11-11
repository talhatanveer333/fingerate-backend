import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { AvatarBannerDTO, AvatarBannerListSearch } from './commons/avatarbanner.dto';
import { MediaService } from '../../media/media.service';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { S3Service } from '../../../utils/s3/s3.service';
import { AvatarBanner } from '../..//avatarbanner/avatarbanner.entity';

@Injectable()
export class AvatarBannerService {
  constructor(
    @InjectRepository(AvatarBanner)
    private readonly avatarBannerRepository: Repository<AvatarBanner>,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
  ) { }

  /**
   * 
   * @param uuid 
   */
  public async getAvatarBanner(uuid: string) {
    const event = await this.avatarBannerRepository.findOne({
      where: {
        uuid
      }
    });
    if (!event) {
      throw new HttpException({
        statusCode: ResponseCode.AVATAR_BANNER_DOES_NOT_EXISTS,
        message: ResponseMessage.AVATAR_BANNER_DOES_NOT_EXISTS
      },
        ResponseCode.BAD_REQUEST)
    }
    return event;
  }


  /**
   * Validate image from media service
   */
  public async validateImage(key: string): Promise<string> {
    const medias = await this.mediaService.getMediaByKeys([key]);
    if (!medias?.length)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_S3_KEY,
          message: ResponseMessage.INVALID_S3_KEY,
        },
        ResponseCode.BAD_REQUEST,
      );
    await this.mediaService.removeMedia([key]);
    return this.s3Service.getPublicURL(key);
  }

  /**
   * Create Avatar Banner
   *
   * @params payload
   * @returns avatar banner
   */
  public async createAvatarBanner(payload: AvatarBannerDTO) {
    payload.image = await this.validateImage(payload.image);
    const avatarBanner = new AvatarBanner().fromDto(payload);
    await this.avatarBannerRepository.save(avatarBanner);
    return avatarBanner;
  }

  /**
   * Update Avatar Banner
   *
   * @params payload
   * @returns avatar banner
   */
  public async updateAvatarBanner(uuid: string, payload: AvatarBannerDTO) {
    const avatarBanner = await this.avatarBannerRepository.findOne({ where: { uuid } });
    if (!avatarBanner)
      throw new HttpException(
        {
          statusCode: ResponseCode.AVATAR_BANNER_DOES_NOT_EXISTS,
          message: ResponseMessage.AVATAR_BANNER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    if (avatarBanner.image !== payload.image)
      payload.image = await this.validateImage(payload.image);
    avatarBanner.fromDto(payload);
    await this.avatarBannerRepository.save(avatarBanner);
    return avatarBanner;
  }

  /**
   * Get All Avatar banners
   *
   * @params query
   * @params paginationOption
   * @returns avatar banners
   */
  public async findAvatarBanner(
    queryOptions: AvatarBannerListSearch,
    paginationOption: IPaginationOptions,
  ) {
    let condition: object;
    if (queryOptions.start_date && queryOptions.end_date) {
      condition = [
        { createdAt: Between(queryOptions.start_date, queryOptions.end_date) }
      ];
    }
    return await this.paginate(paginationOption, condition);
  }

  /**
   * Paginate avatar banner 
   *
   * @param options
   * @param condition
   * @param relations
   * @returns
   */
  private async paginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<AvatarBanner>> {
    return paginate<AvatarBanner>(this.avatarBannerRepository, options, {
      order: { createdAt: 'DESC' },
      where: condition,
      relations,
    });
  }
}
