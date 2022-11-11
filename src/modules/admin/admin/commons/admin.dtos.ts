import {
  IsNotEmpty,
  Matches,
  IsEmail,
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsIP,
} from 'class-validator';
import { ResponseMessage } from './../../../../utils/enum';

export class AdminEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @Matches(
    /^[a-zA-Z]+[a-zA-Z0-9_.-]*[a-zA-Z0-9]+@(([a-zA-Z0-9-]){3,30}.)+([a-zA-Z0-9]{2,5})$/,
    { message: ResponseMessage.INVALID_EMAIL },
  )
  @Matches(/^(?!.*[-_.]{2}).*$/, {
    message: ResponseMessage.INVALID_EMAIL,
  })
  email: string;
}

export class AdminLogDTO {
  @IsNotEmpty()
  @IsString()
  @IsIP()
  ip: string;

  @IsNotEmpty()
  @IsString()
  browser: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  activity_log: number;
}

export class AdminListDTO {
  @IsOptional()
  email: string;
}
