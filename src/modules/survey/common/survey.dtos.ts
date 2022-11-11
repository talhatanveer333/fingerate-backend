import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  ArrayNotEmpty,
  IsPositive,
  IsUUID,
  ValidateIf,
  IsEnum,
  MaxLength,
  ValidateNested,
  IsString,
  Min,
  IsEmail,
  IsOptional,
  Max,
  IsEmpty,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import {
  CommentOrderBy,
  Sort,
  SurveyParticipationStatus,
  SurveyStatus,
  SurveyType,
} from './survey.enums';
import { GreaterThanNow } from '../../common/validator/greater-than.validator';
import { IsValidCountry } from '../../common/validator/country.validator';
import { IsValidPhoneNumber } from '../../common/validator/phone.validator';
import { ResponseMessage } from '../../../utils/enum';

export class AddSurveySotDto {
  @IsUUID('all', { each: true })
  @ArrayNotEmpty()
  sots: string[];

  @IsEnum(SurveyType)
  type: string;
}

export class AddSurveyInfoDto {
  @IsPositive()
  @GreaterThanNow()
  startingDate: number;

  @IsPositive()
  @GreaterThanNow()
  endingDate: number;

  @IsNotEmpty()
  @IsBoolean()
  limitedParticipants: boolean;

  @IsPositive()
  @ValidateIf((val) => val.limitedParticipants)
  participantsCount: number;

  @IsPositive()
  rewardeesCount: number;

  @IsPositive()
  rewardAmount: number;
}

export class SurveyParamDto {
  @IsNotEmpty()
  @IsUUID()
  surveyId: string;
}

export class CommentParamsDto {
  @IsNotEmpty()
  @IsUUID()
  commentId: string;
}

export class SurveyParticipantDto {
  @IsNotEmpty()
  @IsUUID()
  optionId: string;
}

export class SotIdDto {
  @IsUUID()
  sotId: string;
}

export class OptionsDto {
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @MaxLength(50)
  description: string;

  @IsNotEmpty()
  @MaxLength(10)
  colour: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  image: string;
}

export class VerifyEmailQuery {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  code: string;
}

export class RegisterSurveyDto {
  @IsEnum(SurveyType)
  type: string;

  @IsUUID('all', { each: true })
  @ArrayNotEmpty()
  sots: string[];

  @IsPositive()
  @GreaterThanNow()
  startingDate: number;

  @IsPositive()
  @GreaterThanNow()
  endingDate: number;

  @IsBoolean()
  limitedParticipants: boolean;

  @IsPositive()
  @ValidateIf((val) => val.limitedParticipants)
  participantsCount: number;

  @IsPositive()
  rewardeesCount: number;

  @IsPositive()
  rewardAmount: number;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => OptionsDto)
  options: OptionsDto[];

  @IsBoolean()
  previewComments: boolean;
}

export class RequestListDto {
  @IsOptional()
  @IsEnum(SurveyStatus)
  status: string;

  @IsOptional()
  @IsEnum(Sort)
  sort: string;
}

export class ParticipationListDto extends RequestListDto {
  @IsOptional()
  @IsEnum(SurveyParticipationStatus)
  status: string;
}

export class SurveyCommentListDto {
  @IsOptional()
  @IsUUID()
  optionId: string;

  @IsOptional()
  @IsEnum(CommentOrderBy)
  orderBy: string;
}

export class AddSurveyCommentDto {
  @IsNotEmpty()
  @MaxLength(500)
  body: string;
}
export class SurveyOptionChartDto extends SurveyParamDto {
  @IsUUID()
  optionId: string;
}

export class SilverBellRequestDto {
  @IsNotEmpty()
  @Matches(/^[A-Za-z ]{2,26}$/, {
    message: ResponseMessage.INVALID_APPLICANT_NAME,
  })
  applicantName: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9 ]{5,12}$/, {
    message: ResponseMessage.INVALID_APPLICANT_COMPANY,
  })
  applicantCompany: string;

  @IsEmail({}, { message: ResponseMessage.INVALID_EMAIL })
  @IsNotEmpty()
  @Matches(
    /^[a-zA-Z0-9_\.\-]*[a-zA-Z0-9]+\@(([a-zA-Z0-9\-]){3,30}\.)+([a-zA-Z0-9]{2,5})$/,
    { message: ResponseMessage.INVALID_EMAIL },
  )
  @Matches(/^(?!.*[\-\_\.]{2}).*$/, { message: ResponseMessage.INVALID_EMAIL })
  applicantEmail: string;

  @IsNotEmpty()
  @IsValidCountry()
  surveyCountry: string;

  @IsNotEmpty()
  @IsValidCountry()
  country: string;

  @IsNotEmpty()
  @IsValidPhoneNumber()
  applicantPhoneNumber: string;
}
