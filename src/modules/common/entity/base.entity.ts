import dayjs from 'dayjs';
import { BeforeInsert, Column } from 'typeorm';

export class BaseEntity {
  @Column()
  createdAt: number;

  @BeforeInsert()
  insertDate() {
    this.createdAt = dayjs().unix();
  }
}
