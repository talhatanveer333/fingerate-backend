import dayjs from 'dayjs';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserWallet } from '../user/userwallet.entity';
import { TransactionType } from './common/payment.enums';
import { IRewardPayload } from '../survey/common/survey.interface';
import { BaseEntity } from '../common/entity/base.entity';
import { Admin } from '../admin/admin/admin.entity';

@Entity({
  name: 'rewards',
})
export class Reward extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  type: string;

  @Column({
    type: 'double precision',
  })
  amount: number;

  @Column({ nullable: true })
  expiredAt: number;

  @Column({ default: TransactionType.INBOUND })
  transactionType: string;

  @Column({ nullable: true })
  reason: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin: Admin;

  @ManyToOne(() => UserWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: UserWallet;

  @Column({ nullable: true })
  survey: string;

  fromDto(payload: IRewardPayload) {
    this.amount = payload.amount;
    this.survey = payload.survey;
    this.type = payload.type;
    this.wallet = payload.wallet;
    this.expiredAt = dayjs().add(3, 'months').unix();
    return this;
  }
}
