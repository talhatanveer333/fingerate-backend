import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ResponseMessage } from './../../../utils/enum';
import {
  AvatarCategoryEnum,
  AvatarColorEnum,
  AvatarItemNameEnum,
} from './marketplace.enums';

export class ItemsQueryDto {
  @IsOptional()
  @IsEnum(AvatarCategoryEnum, { message: ResponseMessage.INVALID_CATEGORY })
  category: string;
}

export class ItemColorsParamsDto {
  @IsNotEmpty()
  @IsEnum(AvatarItemNameEnum, { message: ResponseMessage.INVALID_ITEM_NAME })
  item_name: string;
}

export class ItemDto {
  @IsNotEmpty()
  item_name: string;

  @IsNotEmpty()
  @IsEnum(AvatarColorEnum)
  color: string;
}
export class AddItemsToCartDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
