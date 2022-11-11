import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    try {
      return !!JSON.parse(request.headers.deviceinfo);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_DEVICE_INFO,
          message: ResponseMessage.INVALID_DEVICE_INFO,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
  }
}
