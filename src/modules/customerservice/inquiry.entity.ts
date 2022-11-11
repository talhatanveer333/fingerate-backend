import { User } from '../../modules/user';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RegisterInquiryDto } from './common/customerservice.dtos';
import { InquiryAttachment } from './inquiryattachment.entity';
import { InquiryStatus } from './common/customerservice.enum';
import { Admin } from '../admin/admin/admin.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { InquiryStatusHistory } from './inquirystatushistory.entity';

@Entity({
  name: 'inquiries',
})
export class Inquiry extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  reply: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ default: InquiryStatus.WAITING_FOR_AN_ANSWER })
  status: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(
    () => InquiryStatusHistory,
    (inquiryStatusHistory) => { inquiryStatusHistory.inquiry }
  )
  replies: InquiryStatusHistory[];

  @OneToMany(
    () => InquiryAttachment,
    (inquiryAttachment) => inquiryAttachment.inquiryId,
  )
  attachments: InquiryAttachment[];

  fromDto(payload: RegisterInquiryDto): Inquiry {
    this.title = payload.title;
    this.content = payload.content;
    return this;
  }
}
