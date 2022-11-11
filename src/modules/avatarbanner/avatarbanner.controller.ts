import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { Controller, Get, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AvatarBannerService } from './avatarbanner.service';
import { AuthGuard } from '@nestjs/passport';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';

@UseGuards(AuthGuard('jwt'))
@Controller('api/avatar_banner')
export class AvatarBannerController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly avatarBannerService: AvatarBannerService,
  ) {
    this.loggerService.setContext('AvatarBannerController');
  }

  @Get('list')
  async getAvatarBanners(@Res() res: Response, @Req() req: Request): Promise<Response> {
    this.loggerService.log(`GET avatar_banner/list ${LoggerMessages.API_CALLED}`);
    const avatarBanners = await this.avatarBannerService.getAvatarBanners();
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: avatarBanners,
    });
  }
}
