import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../modules/user/user.entity';
import { AvatarItem } from '../../modules/marketplace/avataritem.entity';
import { BaseEntity } from '../common/entity/base.entity';

@Entity({
  name: 'users_items_wishlists',
})
export class UserItemWishlist extends BaseEntity {
  @ManyToOne(() => User, (user) => user.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  userId: User;

  @ManyToOne(() => AvatarItem, (item) => item.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itemId' })
  itemId: AvatarItem;

  fromDto(avatarItem: AvatarItem, user: User): UserItemWishlist {
    this.userId = user;
    this.itemId = avatarItem;
    return this;
  }
}
