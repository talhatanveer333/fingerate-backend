import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ResponseMessage } from '../../../../utils/enum';

export class TwoFactorPayload {
  @IsNotEmpty()
  @IsString()
  code: string;
}
export class ToggleTwoFactorPayload {
  @IsNotEmpty()
  @IsString()
  code: string;
}
export class ConfrimEmailPayload {
  @Matches(
    /^[a-zA-Z]+[a-zA-Z0-9_.-]*[a-zA-Z0-9]+@(([a-zA-Z0-9-]){3,30}.)+([a-zA-Z0-9]{2,5})$/,
    { message: ResponseMessage.INVALID_EMAIL },
  )
  @Matches(/^(?!.*[-_.]{2}).*$/, {
    message: ResponseMessage.INVALID_EMAIL,
  })
  email: string;
}
