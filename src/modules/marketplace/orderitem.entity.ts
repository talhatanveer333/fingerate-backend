import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { AvatarItem } from '../../modules/marketplace/avataritem.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { Order } from './order.entity';

@Entity({
  name: 'orders_items',
})
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  orderId: Order;

  @ManyToOne(() => AvatarItem, (item) => item.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itemId' })
  itemId: AvatarItem;

  fromDto(avatarItem: AvatarItem, order: Order): OrderItem {
    this.orderId = order;
    this.itemId = avatarItem;
    return this;
  }
}
