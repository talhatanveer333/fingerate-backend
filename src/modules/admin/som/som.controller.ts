import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '../../../utils/logger/logger.service';
import { AdminSomService } from './som.service';
import { Response, Request } from 'express';
import {
  paymentOrRewardDTO,
  SomUserHistoryDTO,
  SomUserListDTO,
  SomStatisticsDTO
} from './common/som.dtos';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { UUIDDto } from '../../common/dtos/index.dtos';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/som')
export class AdminSomController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly adminSomService: AdminSomService,
  ) {
    this.loggerService.setContext('AdminSomController');
  }

  @Get('/payment_or_reward/:uuid/:type')
  async getPaymentOrReward(
    @Res() res: Response,
    @Param() { uuid, type }: paymentOrRewardDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/som/payment_or_reward/:uuid/:type ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminSomService.getPaymentOrReward(uuid, type);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('user_list')
  async getUserList(
    @Res() res: Response,
    @Req() req: Request,
    @Query() queryOptions: SomUserListDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/som/user_list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.adminSomService.getUserList(
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('user_details/:uuid')
  async getUserDetails(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/som/user_details ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminSomService.getUserDetails(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('user_history/:uuid')
  async getUserHistory(
    @Res() res: Response,
    @Req() req: Request,
    @Param() { uuid }: UUIDDto,
    @Query() queryOptions: SomUserHistoryDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/som/user_history ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.adminSomService.getUserHistory(
      uuid,
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/statistics')
  public async getSomStatistics(
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOptions: SomStatisticsDTO,
  ) {
    this.loggerService.log(
      `GET admin/som/statistics ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminSomService.getSomStatistics(queryOptions);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }
}
