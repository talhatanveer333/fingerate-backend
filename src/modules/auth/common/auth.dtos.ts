import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsValidCountry } from '../../common/validator/country.validator';
import { IsValidPhoneNumber } from '../../common/validator/phone.validator';
import { ResponseMessage } from '../../../utils/enum';
import { SameAs } from './../../common/validator/same-as.validator';

export class NickNameDto {
  @IsNotEmpty()
  nickName: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()_%!-])[A-Za-z\d$&+,:;=?@#|'<>.^*()_%!-]{8,50}$/,
    {
      message: ResponseMessage.INVALID_PASSWORD,
    },
  )
  password: string;
}

export class EmailDto {
  @IsEmail({}, { message: ResponseMessage.INVALID_EMAIL })
  @IsNotEmpty()
  @Matches(
    /^[a-zA-Z0-9_\.\-]*[a-zA-Z0-9]+\@(([a-zA-Z0-9\-]){3,30}\.)+([a-zA-Z0-9]{2,5})$/,
    { message: ResponseMessage.INVALID_EMAIL },
  )
  @Matches(/^(?!.*[\-\_\.]{2}).*$/, { message: ResponseMessage.INVALID_EMAIL })
  email: string;
}

export class CreatePasswordDto {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()_%!-])[A-Za-z\d$&+,:;=?@#|'<>.^*()_%!-]{8,50}$/,
    {
      message: ResponseMessage.INVALID_PASSWORD,
    },
  )
  password: string;

  @SameAs('password', { message: ResponseMessage.PASSWORD_NOT_MATCH })
  passwordConfirmation: string;
}

export class ConfirmPasswordDto extends EmailDto {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()_%!-])[A-Za-z\d$&+,:;=?@#|'<>.^*()_%!-]{8,50}$/,
    {
      message: ResponseMessage.INVALID_PASSWORD,
    },
  )
  password: string;

  @SameAs('password', { message: ResponseMessage.PASSWORD_NOT_MATCH })
  passwordConfirmation: string;

  @IsNumberString({}, { message: ResponseMessage.INVALID_VERIFICATION_CODE })
  @MaxLength(6)
  @MinLength(6)
  code: string;
}

export class verificationCodeDto extends EmailDto {
  @IsNumberString({}, { message: ResponseMessage.INVALID_VERIFICATION_CODE })
  @MaxLength(6)
  @MinLength(6)
  code: string;
}

export class AutoLoginDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;
}

export class LogoutDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;
}

export class ReferralCodeDto {
  @IsNotEmpty()
  @IsString()
  @Length(10, 10, { message: ResponseMessage.INVALID_REFERRAL_CODE })
  referralCode: string;
}

export class PhoneNumberDTO {
  @IsNotEmpty()
  @IsValidCountry()
  country: string;

  @IsNotEmpty()
  @IsValidPhoneNumber()
  phoneNumber: string;
}

export class PhoneNumberVerifyDTO {
  @IsNotEmpty()
  @IsValidCountry()
  country: string;

  @IsNotEmpty()
  @IsValidPhoneNumber()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  token: string;
}
