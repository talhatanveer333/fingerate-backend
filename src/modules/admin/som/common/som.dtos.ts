import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Validate,
  Matches,
} from 'class-validator';
import { EpochValidator } from '../../../../modules/common/validator/epoch.validator';
import { ResponseMessage } from '../../../../utils/enum';
import { TransactionType } from './som.enum';
import { UUIDDto } from '../../../common/dtos/index.dtos';
import { IsValidDateFilterConstraint } from '../../../common/validator/date-filter.validator';
import dayjs from 'dayjs';

export class SomUserListDTO {
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsOptional()
  @IsString()
  nickName: string;

  @IsNotEmpty()
  @IsOptional()
  @IsString()
  phoneNumber: string;
}

export class SomStatisticsDTO {
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

export class SomUserHistoryDTO {
  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} start_date`,
  })
  @IsOptional()
  start_date: string;

  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} end_date`,
  })
  @IsOptional()
  end_date: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type: string;
}
export class paymentOrRewardDTO extends UUIDDto {
  @IsEnum(TransactionType)
  type: string;
}
