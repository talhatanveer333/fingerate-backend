import { IsEmail, IsNotEmpty, Matches } from 'class-validator';
import { ResponseMessage } from '../../../utils/enum';

export class RegisterPayload {
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
