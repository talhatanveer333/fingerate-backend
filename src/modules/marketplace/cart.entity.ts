import { Entity, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './../user/user.entity';
import { BaseEntity } from '../common/entity/base.entity';
@Entity({
  name: 'carts',
})
export class Cart extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @OneToOne(() => User, (user) => user.cart, { onDelete: 'CASCADE' })
  user: User;
}
