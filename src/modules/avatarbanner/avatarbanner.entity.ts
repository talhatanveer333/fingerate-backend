import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AvatarBannerStatusEnum } from './commons/avatarbanner.enum';
import { BaseEntity } from '../common/entity/base.entity';
import { AvatarBannerDTO } from 'modules/admin/avatarbanner/commons/avatarbanner.dto';

@Entity({
  name: 'avatar_banners',
})
export class AvatarBanner extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  image: string;

  @Column()
  pushLink: string;

  @Column({
    type: 'enum',
    enum: AvatarBannerStatusEnum,
    default: AvatarBannerStatusEnum.DISABLED,
  })
  status: string;

  fromDto(payload: AvatarBannerDTO): AvatarBanner {
    this.image = payload.image;
    this.pushLink = payload.pushLink;
    this.status = payload.status;
    return this;
  }
}