import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvatarBanner } from './avatarbanner.entity';
import { AvatarBannerStatusEnum } from './commons/avatarbanner.enum';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';

@Injectable()
export class AvatarBannerService {
  constructor(
    @InjectRepository(AvatarBanner)
    private readonly avatarBannerRepository: Repository<AvatarBanner>,
  ) {}

  /**
   * Get Avatar Banners
   *
   * @returns
   */
  public async getAvatarBanners(): Promise<{ avatarBanners: AvatarBanner[]; }> {
    const avatarBanners = await this.avatarBannerRepository.query(
      `
      SELECT * FROM avatar_banners WHERE status = $1 ORDER BY "createdAt" DESC LIMIT 3
    `,
      [AvatarBannerStatusEnum.ACTIVE],
    );

    return { avatarBanners: avatarBanners as AvatarBanner[] };
  }
}
