import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity({
  name: 'user_session_infos',
})
export class UserSessionInfo {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  loginToken: string;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ nullable: true })
  deviceInfo: string;

  @Column({ nullable: true })
  lastLogin: number;

  @OneToOne(() => User, (user) => user.sessionInfo, { onDelete: 'CASCADE' })
  user: User;
}
