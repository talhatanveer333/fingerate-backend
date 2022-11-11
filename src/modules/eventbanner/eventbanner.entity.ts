import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EventBannerStatusEnum } from './commons/eventbanner.enum';
import { BaseEntity } from '../common/entity/base.entity';
import { EventBannerDTO } from './../../modules/admin/eventbanner/commons/eventbanner.dto';

@Entity({
  name: 'event_banners',
})
export class EventBanner extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  image: string;

  @Column()
  pushLink: string;

  @Column({
    type: 'enum',
    enum: EventBannerStatusEnum,
    default: EventBannerStatusEnum.DISABLED,
  })
  status: string;

  fromDto(payload: EventBannerDTO): EventBanner {
    this.title = payload.title;
    this.content = payload.content;
    this.image = payload.image;
    this.pushLink = payload.pushLink;
    this.status = payload.status;
    return this;
  }
}
