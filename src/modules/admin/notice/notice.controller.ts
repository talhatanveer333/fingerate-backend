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
import { NoticeService } from './notice.service';
import { Request, Response } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { NoticeDTO, NoticeListSearch } from './commons/notice.dto';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/notice')
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminNotificationController');
  }

  @Get('/id/:uuid')
  public async getNotice(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(`GET admin/notice/id/:uuid ${LoggerMessages.API_CALLED}`);
    const data = await this.noticeService.getNotice(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('list')
  public async list(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: NoticeListSearch,
  ) {
    this.loggerService.log(
      `GET admin/notice/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.noticeService.find(query, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post()
  public async create(@Res() res: Response, @Body() payload: NoticeDTO) {
    this.loggerService.log(`POST admin/notice ${LoggerMessages.API_CALLED}`);
    const notice = await this.noticeService.create(payload);
    return res.status(ResponseCode.CREATED_SUCCESSFULLY).send({
      statusCode: ResponseCode.CREATED_SUCCESSFULLY,
      message: ResponseMessage.CREATED_SUCCESSFULLY,
      notice,
    });
  }

  @Put('/:uuid')
  public async update(
    @Res() res: Response,
    @Body() payload: NoticeDTO,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(`PUT admin/notice/:uuid ${LoggerMessages.API_CALLED}`);
    await this.noticeService.update(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
