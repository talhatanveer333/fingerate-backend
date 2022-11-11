import {
  Allow,
  IsBooleanString,
  IsEnum,
  IsNumberString,
  IsOptional,
  Matches,
  Validate,
} from 'class-validator';
import { UserStatusEnum } from './../../../../modules/auth/common/auth.enums';
import { ResponseMessage } from '../../../../utils/enum';
import { EpochValidator } from '../../../common/validator/epoch.validator';

export class UserListDTO {
  @Matches(
    /^[a-zA-Z]+[a-zA-Z0-9_.-]*[a-zA-Z0-9]+@(([a-zA-Z0-9-]){3,30}.)+([a-zA-Z0-9]{2,5})$/,
    { message: ResponseMessage.INVALID_EMAIL },
  )
  @Matches(/^(?!.*[-_.]{2}).*$/, {
    message: ResponseMessage.INVALID_EMAIL,
  })
  @IsOptional()
  email: string;

  @IsOptional()
  nick_name: string;

  @IsOptional()
  @IsEnum(UserStatusEnum)
  status: string;

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
