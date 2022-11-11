import { IsNumberString, IsOptional, Validate } from 'class-validator';
import { ResponseMessage } from './../../../../utils/enum';
import { EpochValidator } from '../../../common/validator/epoch.validator';
import { IsValidDateFilterConstraint } from '../../../common/validator/date-filter.validator';
import dayjs from 'dayjs';

export class PaymentStatisticsDTO {
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
