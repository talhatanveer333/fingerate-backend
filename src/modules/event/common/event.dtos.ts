import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsPositive,
  MaxLength,
  Validate,
} from 'class-validator';
import { EpochValidator } from '../../../modules/common/validator/epoch.validator';
import { ResponseMessage } from '../../../utils/enum';
import { EventType } from './event.enums';

export class AttendanceDto {
  @IsEnum(EventType)
  eventType: string;

  @IsPositive()
  @MaxLength(10)
  attendanceDate: number;
}

export class MonthlyAttendaceDto {
  @IsNotEmpty()
  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} date `,
  })
  date: number;
}
