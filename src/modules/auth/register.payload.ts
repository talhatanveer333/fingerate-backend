import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  Matches,
  IsEnum,
  ValidateIf,
  MaxLength,
  MinLength,
  IsObject,
  IsNotEmptyObject,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ResponseMessage } from '../../utils/enum';
import { IsValidCountry } from '../../modules/common/validator/country.validator';
import { IsValidPhoneNumber } from '../../modules/common/validator/phone.validator';
import { Gender } from './common/auth.enums';

export class RegisterPayload {
  @ValidateIf((val) => !val.avatar)
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]{5,12}$/, { message: ResponseMessage.INVALID_NICKNAME })
  @IsOptional()
  nickName: string;

  @ValidateIf((val) => !val.avatar)
  @IsPositive()
  @IsOptional()
  age: number;

  @ValidateIf((val) => !val.avatar)
  @IsEnum(Gender)
  @IsOptional()
  gender: string;

  @IsOptional()
  @IsNotEmpty()
   @IsString()
  avatar: string;
}
