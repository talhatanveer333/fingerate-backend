import { PaymentStatisticsDTO } from './commons/payment.dto';

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminPaymentService } from './payment.service';
import { Response } from 'express';
import { LoggerService } from '../../../utils/logger/logger.service';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from './../../../utils/enum';
import { AuthGuard } from '@nestjs/passport';
import { IPaymentStatisticsFilters } from './commons/payment.type';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/payment')
export class AdminPaymentController {
  constructor(
    private readonly paymentService: AdminPaymentService,
    private readonly loggerService: LoggerService,
  ) { }

  @Get('/cumulative_statistics')
  public async getCumulativePaymentStatistics(
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOptions: PaymentStatisticsDTO,
  ) {
    this.loggerService.log(
      `GET admin/payment/cumulative_statistics ${LoggerMessages.API_CALLED}`,
    );
    const dateFilter: IPaymentStatisticsFilters =
      await this.paymentService.setPaymentDateFilter(queryOptions);
    const data = await this.paymentService.getCumulativePaymentStatistics(
      dateFilter,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/graph_stats')
  async getGraphStats(
    @Res() res: Response,
    @Query() queryOptions: PaymentStatisticsDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/payment/graph_stats ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.paymentService.getPaymentGraph(queryOptions);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
