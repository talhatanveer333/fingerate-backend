import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { Controller, Get, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { EventBannerService } from './eventbanner.service';
import { AuthGuard } from '@nestjs/passport';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';

@UseGuards(AuthGuard('jwt'))
@Controller('api/event_banner')
export class EventBannerController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly eventBannerService: EventBannerService,
  ) {
    this.loggerService.setContext('EventBannerController');
  }

  @Get('list')
  async getActiveEventBanners(@Res() res: Response, @Req() req: Request): Promise<Response> {
    this.loggerService.log(`GET event_banner/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const eventBanners = await this.eventBannerService.getActiveEventBanners(pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: eventBanners,
    });
  }
}
