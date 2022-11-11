import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBanner } from './eventbanner.entity';
import { EventBannerStatusEnum } from './commons/eventbanner.enum';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';

@Injectable()
export class EventBannerService {
  constructor(
    @InjectRepository(EventBanner)
    private readonly eventBannerRepository: Repository<EventBanner>,
  ) {}

  /**
   * Get active Event Banners list and total count 
   *
   * @param limit
   * @param page
   * @returns eventBanners, total
   */
  public async getActiveEventBanners({
    limit,
    page,
  }: IPaginationOptions): Promise<{ eventBanners: EventBanner[]; total: number }> {
    limit = Number(limit);
    page = Number(page) - 1;
    const eventBanners = await this.eventBannerRepository.query(
      ` SELECT * FROM event_banners WHERE status = $1 ORDER BY "createdAt" ASC LIMIT $2 OFFSET $3`,
      [EventBannerStatusEnum.ACTIVE, limit, limit * page],
    );
    const eventBannersCount = await this.eventBannerRepository.query(
      ` SELECT COUNT(*) as total FROM event_banners WHERE status = $1`,
      [EventBannerStatusEnum.ACTIVE],
    );
    return { eventBanners: eventBanners as EventBanner[], total: eventBannersCount[0].total };
  }
}
