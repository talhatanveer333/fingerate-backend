import { BaseEntity } from '../common/entity/base.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({
  name: 'users_notifications',
})
export class UserNotification extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    nullable: true,
  })
  title: string;

  @Column()
  type: string;

  @Column({
    nullable: true,
  })
  body: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isSettled: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
