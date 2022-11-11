import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { SotService } from './sot.service';
import {
  MapSotListQueryDto,
  SotIdParamDto,
  SotListQueryDto,
} from './common/sot.dtos';

@UseGuards(AuthGuard('jwt'))
@Controller('api/sot')
export class SotController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly sotService: SotService,
  ) {
    this.loggerService.setContext('SotController');
  }

  @Get('sot_list')
  async getSotList(
    @Query() query: SotListQueryDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(`Post survey/sot_list ${LoggerMessages.API_CALLED}`);
    const sots = await this.sotService.getSotList(query);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: sots,
    });
  }

  @Get('map_sot_list')
  async getMapSotList(
    @Query() query: MapSotListQueryDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/map_sot_list ${LoggerMessages.API_CALLED}`,
    );
    const sots = await this.sotService.getMapSotList(query);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: sots,
    });
  }

  @Get('sot_by_id/:sotId')
  async getSotById(
    @Param() param: SotIdParamDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(`Post survey/add_sot ${LoggerMessages.API_CALLED}`);
    const sot = await this.sotService.getSotById(param.sotId);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: sot,
    });
  }
}
