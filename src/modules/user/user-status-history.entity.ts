import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { UserStatusEnum } from '../auth/common/auth.enums';

@Entity({
  name: 'user_status_history',
})
export class UserStatusHistory extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'enum',
    enum: UserStatusEnum,
    nullable: false,
  })
  status: string;

  @Column({ nullable: false })
  reason: string;

  @ManyToOne(() => User, (user) => user.statusHistory)
  user: User;
}
