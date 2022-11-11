import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity({
  name: 'users_notifications_settings',
})
export class UserNotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  all: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  dailyCheck: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  dailySurveyParticipation: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  surveyRequest: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  allUser: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  participation: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  surveyGoesLive: boolean;

  @OneToOne(() => User, (user) => user.notificationSetting, {
    onDelete: 'CASCADE',
  })
  user: User;
}
