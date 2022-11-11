import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPositive,
  IsString,
  Validate,
} from 'class-validator';
import { EpochValidator } from './../../../../modules/common/validator/epoch.validator';
import { ResponseMessage } from './../../../../utils/enum';
import {
  AvatarColorEnum,
  AvatarGenderEnum,
  AvatarStatusEnum,
  AvatarItemNameEnum,
  AvatarCategoryEnum,
  UserAvatarCategoryEnum,
} from '../../../../modules/marketplace/common/marketplace.enums';

export class AvatarListDTO {
  @IsOptional()
  @IsEnum(AvatarCategoryEnum, { message: 'enter a valid category' })
  category: string;

  @IsOptional()
  item_name: string;

  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} start_date `,
  })
  @IsOptional()
  start_date: number;

  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} end_date `,
  })
  @IsOptional()
  end_date: number;
}

export class AvatarDTO {
  @IsNotEmpty()
  @IsEnum(AvatarCategoryEnum, { message: 'enter a valid categrory' })
  category: string;

  @IsNotEmpty()
  @IsEnum(AvatarGenderEnum, { message: 'enter a valid gender' })
  gender: string;

  @IsNotEmpty()
  @IsEnum(AvatarItemNameEnum, { message: 'enter a valid item name' })
  item_name: string;

  @IsNotEmpty()
  @IsPositive()
  price: number;

  @IsNotEmpty()
  @IsEnum(AvatarColorEnum, { message: 'enter a valid color' })
  color: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(AvatarStatusEnum, { message: 'enter a valid status' })
  status: string;
}

export class UsersAvatarListDTO {
  @IsOptional()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  nickName: string;

  @IsOptional()
  @IsString()
  item_name: string;

  @IsOptional()
  @IsEnum(UserAvatarCategoryEnum, { message: ResponseMessage.INVALID_USER_AVATAR_CATEGORY })
  category: string;
}