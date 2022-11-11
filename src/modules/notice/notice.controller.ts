import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { Controller, Get, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { NoticeService } from './notice.service';
import { AuthGuard } from '@nestjs/passport';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';

@Controller('api/notice')
export class NoticeController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly noticeService: NoticeService,
  ) {
    this.loggerService.setContext('NoticeController');
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Notices APIs
  /*
  /********************************************************************************************************************/
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async find(@Res() res: Response, @Req() req: Request): Promise<Response> {
    this.loggerService.log(`GET notice/ ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const notices = await this.noticeService.find(pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: notices,
    });
  }
}
