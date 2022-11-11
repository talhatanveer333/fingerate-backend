import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SilverBellRequestStatus } from '../../../survey/common/survey.enums';
import { RegisterSurveyDto } from '../../../../modules/survey/common/survey.dtos';
import { UUIDDto } from '../../../common/dtos/index.dtos';

export class SurveyListDTO {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  sot_name: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  sot_grade: string;

  @IsString()
  @IsOptional()
  survey_status: string;
}

export class RegisterSurveyFromAdminDTO extends RegisterSurveyDto {
  @IsOptional()
  @IsUUID()
  userId: string;
}

export class ManagedSurveyListDTO {
  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  company: string;

  @IsString()
  @IsOptional()
  phoneNumber: string;

  @IsEnum(SilverBellRequestStatus)
  @IsOptional()
  status: string;
}

export class ManageSurveyStatusDTO {
  @IsEnum(SilverBellRequestStatus)
  status: string;
}
