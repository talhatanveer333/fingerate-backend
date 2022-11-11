import {
  ArrayMaxSize,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { EpochValidator } from '../../../../modules/common/validator/epoch.validator';
import { ResponseMessage } from '../../../../utils/enum';
import { InquiryStatus } from '../../../../modules/customerservice/common/customerservice.enum';

export class RegisterInquiryReplyDTO {
  @IsUUID()
  inquiryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  memo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  reply: string;

  @IsString()
  @IsEnum(InquiryStatus)
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @ArrayMaxSize(3)
  @IsNotEmpty({ each: true })
  attachments: string[];
}

export class ListInquiryDTO {
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

  @IsString()
  @IsOptional()
  username: string;

  @IsEnum(InquiryStatus)
  @IsOptional()
  status: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'invalid uuid' })
  uuid: string;
}
