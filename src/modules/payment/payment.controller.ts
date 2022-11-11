import { AuthGuard } from '@nestjs/passport';
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
  HttpException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { User } from '../user/user.entity';
import { PaymentService } from './payment.service';
import { SurveyParamDto } from '../survey/common/survey.dtos';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  ConversionQueryDto,
  RechargePaymentDto,
  TossPaymentFailDto,
} from './common/payment.dtos';

@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly paymentService: PaymentService,
  ) {
    this.loggerService.setContext('PaymentController');
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Make Survey payment
  /*
  /********************************************************************************************************************/
  @UseGuards(AuthGuard('jwt'))
  @Post('make_survey_payment/:surveyId')
  async makeSurveyPayment(
    @Param() params: SurveyParamDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST payment/make_survey_payment/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    await this.paymentService.makeSurveyPayment(params.surveyId, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('convert_usd_to_wan')
  async convertUsdToWan(
    @Query() query: ConversionQueryDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST payment/convert_usd_to_wan ${LoggerMessages.API_CALLED}`,
    );
    const wan = await this.paymentService.getWanFromUsd(query.usd);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: wan,
    });
  }

  @Get('make_recharge')
  async makeRechargePayment(
    @Query() queryOption: RechargePaymentDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST payment/make_recharge ${LoggerMessages.API_CALLED}`,
    );
    await this.paymentService.makeRecharge(queryOption);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('toss_payment_fail')
  async paymentFail(
    @Res() res: Response,
    @Query() queryOption: TossPaymentFailDto,
  ): Promise<Response> {
    this.loggerService.log(
      `Get payment/toss_payment_fail ${LoggerMessages.API_CALLED}`,
    );
    return res.status(ResponseCode.BAD_REQUEST).send({
      statusCode: ResponseCode.BAD_REQUEST,
      message: queryOption.code,
    });
  }
}
