import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { AvatarItem } from '../marketplace/avataritem.entity';

@Entity({
  name: 'users_items_collections',
})
export class UserItemCollection {
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

  fromDto(avatarItem: AvatarItem, user: User): UserItemCollection {
    this.userId = user;
    this.itemId = avatarItem;
    return this;
  }
}
