import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { LoginType } from './common/auth.enums';

export class LoginPayload {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsBoolean()
  autoLogin: boolean;

  @IsOptional()
  @IsString()
  // @ValidateIf((val) => val.autoLogin !== false)
  deviceId: string;
}

export class SocialLoginPayload {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsEnum(LoginType)
  loginType: string;

  @IsBoolean()
  autoLogin: boolean;

  @IsOptional()
  @IsString()
  // @ValidateIf((val) => val.autoLogin !== false)
  deviceId: string;
}
