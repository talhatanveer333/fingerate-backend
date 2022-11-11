import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity({
  name: 'user_avatars',
})
export class UserAvatar {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    nullable: true,
  })
  avatar: string;

  @OneToOne(() => User, (user) => user.avatar, { onDelete: 'CASCADE' })
  user: User;
}
