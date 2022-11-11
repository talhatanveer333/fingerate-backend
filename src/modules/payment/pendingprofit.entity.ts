import { BaseEntity } from '../common/entity/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfitEnum } from './common/payment.enums';
import { ProfitPayment } from './profitpayment.entity';
@Entity({
  name: 'pending_profits',
})
export class PendingProfit extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  sotId: string;

  @Column()
  surveyId: string;

  @Column()
  ownerAddress: string;

  @Column({
    type: 'double precision',
  })
  amountInSom: number;

  @Column({ default: ProfitEnum.PENDING })
  status: string;

  @ManyToOne(() => ProfitPayment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paidId' })
  profitPayment: ProfitPayment;
}
