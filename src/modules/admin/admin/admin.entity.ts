import { RegisterPayload } from '../auth';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import moment from 'moment';
import { AccountStatus } from './commons/admin.enum';
import { IsEnum } from 'class-validator';

@Entity({
  name: 'admins',
})
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({
    nullable: true,
    name: 'password',
    length: 255,
  })
  password: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  twoFa: boolean;

  @Column({
    length: 255,
    nullable: true,
  })
  twoFaKey: string;

  @Column({ type: 'boolean', default: false })
  emailConfirmed: boolean;

  @Column({ nullable: true, default: moment().unix() })
  created_at: number;

  @Column({ length: 255, default: AccountStatus.DISABLE })
  @IsEnum(AccountStatus)
  status: string;

  toJSON() {
    const { password, twoFa, twoFaKey, emailConfirmed, ...self } = this;
    return self;
  }

  toDto() {
    const { password, ...dto } = this;
    return dto;
  }

  fromDto(payload: RegisterPayload): Admin {
    this.email = payload.email;

    return this;
  }
}
