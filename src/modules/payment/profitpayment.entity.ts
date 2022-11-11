import { BaseEntity } from '../common/entity/base.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'profit_payments',
})
export class ProfitPayment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  ownerAddress: string;

  @Column({
    type: 'double precision',
  })
  amountInSom: number;
}