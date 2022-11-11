import dayjs from 'dayjs';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NoticeStatusEnum } from './commons/notice.enum';
import { NoticeDTO } from '../admin/notice/commons/notice.dto';
import { BaseEntity } from '../../modules/common/entity/base.entity';

@Entity({
  name: 'notices',
})
export class Notice extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  image: string;

  @Column({ nullable: true })
  url: string;

  @Column({
    type: 'enum',
    enum: NoticeStatusEnum,
    default: NoticeStatusEnum.DISABLED,
  })
  status: string;

  fromDto(payload: NoticeDTO): Notice {
    this.title = payload.title;
    this.content = payload.content;
    this.image = payload.image;
    this.status = payload.status;
    this.url = payload.url;
    return this;
  }
}
