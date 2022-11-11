import { IsNumberString, Validate, IsEnum, IsOptional } from 'class-validator';
import { ResponseMessage } from './../../../../utils/enum';
import { EpochValidator } from './../../../../modules/common/validator/epoch.validator';
import { SOT_Fields_Name } from './sot.enum';
import { IsValidDateFilterConstraint } from '../../../common/validator/date-filter.validator';
import dayjs from 'dayjs';

export class SotListDTO {
  @IsOptional()
  @IsEnum(SOT_Fields_Name)
  field_name: string;

  @IsOptional()
  value: string;
}
export class SotStatisticsSDTO {
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
