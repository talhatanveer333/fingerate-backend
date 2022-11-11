import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '../../../utils/logger/logger.service';
import { EventBannerService } from './eventbanner.service';
import { Request, Response } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import {
  EventBannerDTO,
  EventBannerListSearch,
} from './commons/eventbanner.dto';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/event_banner')
export class EventBannerController {
  constructor(
    private readonly eventBannerService: EventBannerService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminEventBannerController');
  }

  @Get('id/:uuid')
  public async getEventBanner(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/event_banner/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.eventBannerService.getEventBanner(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('list')
  public async listEventBanners(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: EventBannerListSearch,
  ) {
    this.loggerService.log(
      `GET admin/event_banner/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.eventBannerService.findEventBanner(
      query,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('create')
  public async createEventBanner(
    @Res() res: Response,
    @Body() payload: EventBannerDTO,
  ) {
    this.loggerService.log(
      `POST admin/event_banner/create ${LoggerMessages.API_CALLED}`,
    );
    const eventBanner = await this.eventBannerService.createEventBanner(
      payload,
    );
    return res.status(ResponseCode.CREATED_SUCCESSFULLY).send({
      statusCode: ResponseCode.CREATED_SUCCESSFULLY,
      message: ResponseMessage.CREATED_SUCCESSFULLY,
      eventBanner,
    });
  }

  @Put('/:uuid')
  public async updateEventBanner(
    @Res() res: Response,
    @Body() payload: EventBannerDTO,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `PUT admin/event_banner/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.eventBannerService.updateEventBanner(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
