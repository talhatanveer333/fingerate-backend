import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AttachmentType } from './common/customerservice.enum';
import { Inquiry } from './inquiry.entity';

@Entity({
  name: 'inquiries_attachments',
})
export class InquiryAttachment {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  image: string;

  @Column({ default: AttachmentType.USER })
  type: string;

  @ManyToOne(() => Inquiry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inquiryId' })
  inquiryId: Inquiry;

  fromDto(payload: string, inquiry: Inquiry): InquiryAttachment {
    this.image = payload;
    this.inquiryId = inquiry;
    return this;
  }
}
