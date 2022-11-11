import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { LoggerService } from '../../../utils/logger/logger.service';
import { Pagination } from '../../../utils/paginate';
import { SotService } from './sot.service';
import { Request, Response } from 'express';
import { SotListDTO, SotStatisticsSDTO } from './commons/sot.dto';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from './../../../modules/common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/sot')
export class SotController {
  constructor(
    private readonly sotService: SotService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminSotController');
  }
  @Get('/list')
  public async getSotsList(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: SotListDTO,
  ) {
    this.loggerService.log(`GET admin/sot/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.sotService.getSotsList(query, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/id/:uuid')
  public async getSotById(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/sot/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.sotService.getSotById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/statistics')
  public async getSotStatistics(
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOptions: SotStatisticsSDTO,
  ) {
    this.loggerService.log(
      `GET admin/sot/statistics ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.sotService.getSotStatistics(queryOptions);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }
}
