import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Admin } from '../admin/admin/admin.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { Inquiry } from './inquiry.entity';

@Entity({
    name: 'inquiry_status_history',
})
export class InquiryStatusHistory extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    uuid: string;

    @Column({ nullable: true })
    memo: string;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: 'adminId' })
    admin: Admin;

    @ManyToOne(() => Inquiry, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'inquiryId' })
    inquiry: Inquiry;


}