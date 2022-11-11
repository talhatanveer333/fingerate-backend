import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { AvatarItem } from '../../modules/marketplace/avataritem.entity';
import { BaseEntity } from '../common/entity/base.entity';
import { Cart } from './cart.entity';

@Entity({
    name: 'carts_items',
})
export class CartItem extends BaseEntity {
    @ManyToOne(() => Cart, (cart) => cart.uuid, {
        primary: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cartId' })
    cartId: Cart;

    @ManyToOne(() => AvatarItem, (item) => item.uuid, {
        primary: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'itemId' })
    itemId: AvatarItem;

    fromDto(avatarItem: AvatarItem, cart: Cart): CartItem {
        this.cartId = cart;
        this.itemId = avatarItem;
        return this;
    }
}