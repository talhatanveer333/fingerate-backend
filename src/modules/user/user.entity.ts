import { RegisterPayload } from '../auth';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserWallet } from './userwallet.entity';
import { UserAvatar } from './useravatar.entity';
import { UserStatusEnum } from '../auth/common/auth.enums';
import { UserNotificationSetting } from './notificationsetting.entity';
import { UserSessionInfo } from './usersessioninfo.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { UserStatusHistory } from './user-status-history.entity';
import { Cart } from '../marketplace/cart.entity';
import { UserRespectPolicy } from './userrespectpolicy.entity';

@Entity({
  name: 'users',
})
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  nickName: string;

  @Column({ length: 255 })
  email: string;

  @Column({
    name: 'password',
    length: 255,
    nullable: true,
  })
  password: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  loginType: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: UserStatusEnum,
    default: UserStatusEnum.ACTIVE,
  })
  status: string;

  @Column({
    nullable: false,
    default: 1,
  })
  respectLevel: number;

  @Column({
    nullable: true,
    default: 0,
  })
  respectLevelPoints: number;

  @Column({
    length: 32,
    nullable: true,
  })
  referralCode: string;

  @Column({
    length: 32,
    nullable: true,
  })
  referredBy: string;

  @Column({
    default: null,
    nullable: true,
  })
  withdrawExpiry: number;

  @Column({
    nullable: true,
    default: 0,
  })
  attendanceStreak: number;

  @Column({
    nullable: true,
    default: 0,
  })
  participationStreak: number;

  @Column({ nullable: true })
  profileImage: string;

  @OneToOne(() => UserWallet)
  @JoinColumn({ name: 'walletId' })
  wallet: UserWallet;

  @OneToOne(() => Cart)
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @OneToOne(() => UserNotificationSetting)
  @JoinColumn({ name: 'notificationSettingId' })
  notificationSetting: UserNotificationSetting;

  @OneToOne(() => UserAvatar)
  @JoinColumn({ name: 'avatarId' })
  avatar: UserAvatar;

  @OneToOne(() => UserSessionInfo)
  @JoinColumn({ name: 'sessionId' })
  sessionInfo: UserSessionInfo;

  @OneToMany(() => UserStatusHistory, (history) => history.user, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  statusHistory: UserStatusHistory;

  @OneToOne(() => UserRespectPolicy)
  @JoinColumn({ name: 'respectPolicyId' })
  respectPolicy: UserRespectPolicy;

  toJSON() {
    const { password, ...self } = this;
    return self;
  }

  toDto() {
    const { password, ...dto } = this;
    return dto;
  }

  fromDto(payload: RegisterPayload): User {
    this.nickName = payload.nickName;
    this.age = payload.age;
    this.gender = payload.gender;
    return this;
  }
}

export class UserFillableFields {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}
