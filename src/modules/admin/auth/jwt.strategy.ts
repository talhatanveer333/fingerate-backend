import { ExtractJwt, Strategy, JwtPayload } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminService } from '../admin';
import { ADMIN_AUTH_TOKEN_TYPES } from './commons/auth.enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'admin_jwt') {
  constructor(private readonly adminService: AdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY,
    });
  }

  async validate({ iat, exp, uuid, tokenType }: JwtPayload, done) {
    const timeDiff = exp - iat;
    if (timeDiff <= 0) {
      throw new UnauthorizedException();
    }

    if (tokenType !== ADMIN_AUTH_TOKEN_TYPES.LOGIN)
      throw new UnauthorizedException();

    const admin = await this.adminService.get(uuid);
    if (!admin) {
      throw new UnauthorizedException();
    }

    delete admin.password;
    done(null, admin);
  }
}
