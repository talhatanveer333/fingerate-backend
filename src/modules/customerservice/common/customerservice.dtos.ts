import {
  IsNotEmpty,
  MaxLength,
  IsString,
  ArrayMaxSize,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class EditInquiryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsNotEmpty({ each: true })
  attachments: string[];
}

export class RegisterInquiryDto extends EditInquiryDto {
  @IsOptional()
  @ArrayMaxSize(3)
  @IsNotEmpty({ each: true })
  attachments: string[];
}

export class InquiryParamDto {
  @IsUUID()
  inquiryId: string;
}
