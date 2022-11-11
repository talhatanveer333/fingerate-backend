import { Survey } from '../survey/survey.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserWallet } from '../user/userwallet.entity';
import { TransactionType } from './common/payment.enums';
import { BaseEntity } from '../common/entity/base.entity';
import { Order } from '../marketplace/order.entity';

@Entity({
  name: 'payments',
})
export class Payment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  paymentStatus: string;

  @Column({ nullable: true })
  type: string;

  @Column({
    type: 'double precision',
  })
  amount: number;

  @Column({ default: TransactionType.OUTBOUND })
  transactionType: string;

  @Column({ nullable: true })
  expiredAt: number;

  @ManyToOne(() => UserWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: UserWallet;

  @ManyToOne(() => Survey)
  @JoinColumn({ name: 'surveyId' })
  surveyId: Survey;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  orderId: Order;
}
