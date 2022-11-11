import { BaseEntity } from '../common/entity/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserWallet } from '../../modules/user/userwallet.entity';
import { TransactionType } from './common/payment.enums';

@Entity({
  name: 'wallet_recharges',
})
export class WalletRecharge extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'double precision',
  })
  amountInUsd: number;

  @Column({ nullable: true })
  type: string;

  @Column({
    type: 'double precision',
  })
  amountInSom: number;

  @Column({ default: TransactionType.INBOUND })
  transactionType: string;

  @ManyToOne(() => UserWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: UserWallet;
}
