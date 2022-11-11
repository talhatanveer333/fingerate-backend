import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { SameAs } from '../../common/validator/same-as.validator';
import { ResponseMessage } from '../../../utils/enum';
import { TransactionEnum } from './user.enums';

export class WithdrawMembershipDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()_%!-])[A-Za-z\d$&+,:;=?@#|'<>.^*()_%!-]{8,50}$/,
    {
      message: ResponseMessage.INVALID_PASSWORD,
    },
  )
  newPassword: string;

  @SameAs('newPassword', { message: ResponseMessage.PASSWORD_NOT_MATCH })
  newPasswordConfirmation: string;
}

export class ChangeNickNameDto {
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]{5,12}$/, { message: ResponseMessage.INVALID_NICKNAME })
  nickName: string;
}

export class TransactionFilterDto {
  @IsNotEmpty()
  @IsEnum(TransactionEnum)
  type: string;
}

export class FcmTokenDto {
  @IsNotEmpty()
  token: string;
}

export class NotificationSettingDto {
  @IsNotEmpty()
  @IsBoolean()
  all: boolean;

  @IsNotEmpty()
  @IsBoolean()
  dailyCheck: boolean;

  @IsNotEmpty()
  @IsBoolean()
  dailySurveyParticipation: boolean;

  @IsNotEmpty()
  @IsBoolean()
  surveyRequest: boolean;

  @IsNotEmpty()
  @IsBoolean()
  allUser: boolean;

  @IsNotEmpty()
  @IsBoolean()
  participation: boolean;

  @IsNotEmpty()
  @IsBoolean()
  surveyGoesLive: boolean;
}
