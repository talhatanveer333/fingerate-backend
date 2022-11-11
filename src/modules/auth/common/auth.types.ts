import { User } from '../../../modules/user/user.entity';

export interface LoginResponse {
  user: User;
  expiresIn: string;
  accessToken: string;
}
