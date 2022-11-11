import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity({
  name: 'users_wallets',
})
export class UserWallet {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    default: 0,
    nullable: true,
    type: 'double precision',
  })
  balance: number;

  @Column({
    default: 0,
    nullable: true,
    type: 'double precision',
  })
  totalReceived: number;

  @Column({
    default: 0,
    nullable: true,
    type: 'double precision',
  })
  totalSent: number;

  @Column({
    default: 0,
    nullable: true,
    type: 'double precision',
  })
  totalRecharged: number;

  @Column({
    default: 0,
    nullable: true,
    type: 'double precision',
  })
  totalSomExpired: number;

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  user: User;
}
