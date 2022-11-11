import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { ResponseCode } from '../../../utils/enum';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const res: any = exception.getResponse();
    if (typeof res === 'object') {
      if (res.statusCode === ResponseCode.BAD_REQUEST)
        res.statusCode = ResponseCode.INVALID_INPUT;
      return response.status(status).send(res);
    } else {
      return response.status(status).send({
        statusCode: status,
        message: res,
      });
    }
  }
}
