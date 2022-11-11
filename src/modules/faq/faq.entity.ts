import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FAQStatusEnum } from './commons/faq.enum';
import { FaqDTO } from '../admin/faq/commons/faq.dto';
import { BaseEntity } from '../common/entity/base.entity';

@Entity({
  name: 'faqs',
})
export class FAQ extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  image: string;

  @Column({
    type: 'enum',
    enum: FAQStatusEnum,
    default: FAQStatusEnum.DISABLED,
  })
  status: string;

  fromDto(payload: FaqDTO): FAQ {
    this.title = payload.title;
    this.content = payload.content;
    this.image = payload.image;
    this.status = payload.status;
    return this;
  }
}
