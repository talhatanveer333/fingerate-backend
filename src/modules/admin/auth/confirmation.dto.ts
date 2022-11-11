import { IsEmail, IsNotEmpty, Matches } from 'class-validator';
import { ResponseMessage } from '../../../utils/enum';
import { SameAs } from '../../common/validator/same-as.validator';

export class ConfirmationPayload {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()_%!-])[A-Za-z\d$&+,:;=?@#|'<>.^*()_%!-]{8,50}$/,
    {
      message: ResponseMessage.INVALID_PASSWORD,
    },
  )
  password: string;

  @SameAs('password')
  passwordConfirmation: string;
}
