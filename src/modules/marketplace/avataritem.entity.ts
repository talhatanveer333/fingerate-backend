import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import moment from 'moment';
import { AvatarDTO } from '../admin/avatar/common/avatar.dto';
import {
  AvatarCategoryEnum,
  AvatarColorEnum,
  AvatarGenderEnum,
  AvatarStatusEnum,
  AvatarItemNameEnum,
} from './common/marketplace.enums';
import { BaseEntity } from '../../modules/common/entity/base.entity';

@Entity({
  name: 'avatars_items',
})
export class AvatarItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'enum',
    enum: AvatarCategoryEnum,
  })
  category: string;

  @Column({
    type: 'enum',
    enum: AvatarGenderEnum,
    default: AvatarGenderEnum.MALE,
  })
  gender: string;

  @Column({
    type: 'enum',
    enum: AvatarItemNameEnum,
  })
  item_name: string;

  @Column()
  price: number;

  @Column({
    default: AvatarColorEnum.WHITE,
  })
  color: string;

  @Column({
    type: 'enum',
    enum: AvatarStatusEnum,
    default: AvatarStatusEnum.ACTIVE,
  })
  status: string;

  // No Column
  image?: string;

  fromDto(payload: AvatarDTO): AvatarItem {
    this.category = payload.category;
    this.gender = payload.gender;
    this.item_name = payload.item_name;
    this.price = payload.price;
    this.color = payload.color;
    this.status = payload.status;
    return this;
  }
}
