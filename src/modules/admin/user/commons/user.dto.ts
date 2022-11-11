import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import dayjs from 'dayjs';
import { IsValidDateFilterConstraint } from '../../../common/validator/date-filter.validator';
import { ResponseMessage } from '../../../../utils/enum';
import { EpochValidator } from '../../../common/validator/epoch.validator';
import { UserStatusEnum } from '../../../auth/common/auth.enums';

export class UserGraphStatDTO {
  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} start_date`,
  })
  @Validate(IsValidDateFilterConstraint, {
    message: `${ResponseMessage.INVALID_DATE_DIFFERENCE}`,
  })
  @IsOptional()
  start_date = dayjs().subtract(5, 'month').unix().toString();

  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} end_date`,
  })
  @Validate(IsValidDateFilterConstraint, {
    message: `${ResponseMessage.INVALID_DATE_DIFFERENCE}`,
  })
  @IsOptional()
  end_date = dayjs().unix().toString();
}

export class UserStatusUpdateDTO {
  @ValidateIf((o) => o.status !== UserStatusEnum.ACTIVE)
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsEnum(UserStatusEnum, { message: 'enter a valid status' })
  status: UserStatusEnum;
}
