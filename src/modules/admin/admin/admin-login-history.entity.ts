import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import moment = require('moment');
import { Admin } from './admin.entity';
import { AdminLogDTO } from './commons/admin.dtos';

@Entity({
  name: 'admin_login_history',
})
export class AdminLoginHistory {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  IP: string;

  @Column({ length: 255 })
  browser: string;

  @Column({ default: moment().unix() })
  activity_log: number;

  @Column()
  userId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'userId' })
  Admin: Admin;

  toJSON() {
    const { uuid, ...self } = this;
    return self;
  }

  toDto() {
    const { uuid, ...dto } = this;
    return dto;
  }

  fromDto(payload: AdminLogDTO): AdminLoginHistory {
    this.browser = payload.browser;
    this.IP = payload.ip;
    this.userId = payload.id;
    this.activity_log = payload.activity_log;
    return this;
  }
}
