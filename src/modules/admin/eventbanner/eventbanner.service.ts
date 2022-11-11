import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { EventBannerDTO, EventBannerListSearch } from './commons/eventbanner.dto';
import { MediaService } from '../../media/media.service';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { S3Service } from '../../../utils/s3/s3.service';
import { EventBanner } from './../../../modules/eventbanner/eventbanner.entity';

@Injectable()
export class EventBannerService {
  constructor(
    @InjectRepository(EventBanner)
    private readonly eventBannerRepository: Repository<EventBanner>,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
  ) { }

  /**
   * 
   * @param uuid 
   */
  public async getEventBanner(uuid: string) {
    const event = await this.eventBannerRepository.findOne({
      where: {
        uuid
      }
    });
    if (!event) {
      throw new HttpException({
        statusCode: ResponseCode.EVENT_BANNER_DOES_NOT_EXISTS,
        message: ResponseMessage.EVENT_BANNER_DOES_NOT_EXISTS
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
   * Create Event Banner
   *
   * @params payload
   * @returns event
   */
  public async createEventBanner(payload: EventBannerDTO) {
    payload.image = await this.validateImage(payload.image);
    const eventBanner = new EventBanner().fromDto(payload);
    await this.eventBannerRepository.save(eventBanner);
    return eventBanner;
  }

  /**
   * Update Event Banner
   *
   * @params payload
   * @returns event
   */
  public async updateEventBanner(uuid: string, payload: EventBannerDTO) {
    const eventBanner = await this.eventBannerRepository.findOne({ where: { uuid } });
    if (!eventBanner)
      throw new HttpException(
        {
          statusCode: ResponseCode.EVENT_BANNER_DOES_NOT_EXISTS,
          message: ResponseMessage.EVENT_BANNER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    if (eventBanner.image !== payload.image)
      payload.image = await this.validateImage(payload.image);
      eventBanner.fromDto(payload);
    await this.eventBannerRepository.save(eventBanner);
    return eventBanner;
  }

  /**
   * Get All Event banners
   *
   * @params query
   * @params paginationOption
   * @returns events
   */
  public async findEventBanner(
    { search }: EventBannerListSearch,
    paginationOption: IPaginationOptions,
  ) {
    let condition: object;
    if (search?.length) {
      condition = [
        { title: Like(`%${search}%`) },
        { content: Like(`%${search}%`) },
      ];
    }
    return await this.paginate(paginationOption, condition);
  }

  /**
   * Paginate Event banner 
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
  ): Promise<Pagination<EventBanner>> {
    return paginate<EventBanner>(this.eventBannerRepository, options, {
      order: { createdAt: 'DESC' },
      where: condition,
      relations,
    });
  }
}
