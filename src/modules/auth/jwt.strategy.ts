import { ExtractJwt, Strategy, JwtPayload } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../user';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, { iat, exp, uuid }: JwtPayload, done) {
    const token = req?.headers?.authorization?.split(' ')?.[1] || '';
    const timeDiff = exp - iat;
    if (timeDiff <= 0) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.get(uuid);
    if (!user || user.sessionInfo.loginToken !== token || !token.length) {
      throw new UnauthorizedException();
    }

    this.usersService.checkUserActiveStatus(user);

    delete user.password;
    done(null, user);
  }
}
