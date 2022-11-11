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
  Patch,
  Post,
  Req,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { SurveyService } from './survey.service';
import {
  SurveyParamDto,
  SurveyParticipantDto,
  SurveyOptionChartDto,
  SotIdDto,
  AddSurveyCommentDto,
  CommentParamsDto,
  VerifyEmailQuery,
  RegisterSurveyDto,
  SurveyCommentListDto,
  RequestListDto,
  ParticipationListDto,
  SilverBellRequestDto,
} from './common/survey.dtos';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from '../user/user.entity';
import { EmailDto } from '../../modules/auth/common/auth.dtos';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';
import { VerifiedEmailService } from '../verified-email/verifiedemail.service';
import dayjs from 'dayjs';

@UseGuards(AuthGuard('jwt'))
@Controller('api/survey')
export class SurveyController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly surveyService: SurveyService,
    private readonly verifiedEmailService: VerifiedEmailService,
  ) {
    this.loggerService.setContext('SurveyController');
  }

  @Post('add_survey_email')
  async addSurveyEmail(
    @Body() payload: EmailDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/add_survey_mail ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.verifiedEmailService.addVerifiedEmail(
      user,
      payload.email,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('verify_survey_email')
  async verifySurveyEmail(
    @Query() query: VerifyEmailQuery,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST survey/verify_result_email/:code ${LoggerMessages.API_CALLED}`,
    );
    await this.verifiedEmailService.verifyEmail(query.email, query.code);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('register_survey')
  async registerSurvey(
    @Body() payload: RegisterSurveyDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/register_survey ${LoggerMessages.API_CALLED}`,
    );
    const difference = dayjs
      .unix(payload.startingDate)
      .diff(dayjs(), 'minutes');
    if (payload.endingDate <= payload.startingDate) {
      throw new HttpException(
        {
          statusCode: ResponseCode.END_DATE_GREATER_THAN_START,
          message: ResponseMessage.END_DATE_GREATER_THAN_START,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const data = await this.surveyService.registerSurvey(payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('survey_receipt/:surveyId')
  public async getSurveyReceipt(
    @CurrentUser() user: User,
    @Param() params: SurveyParamDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/survey_receipt/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const surveyReceipt = await this.surveyService.getSurveyReceipt(
      params.surveyId,
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: surveyReceipt,
    });
  }

  @Get('list_by_sotId/:sotId')
  async getSurveylistBySotId(
    @Param() params: SotIdDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Get survey/list_by_sotid/sotId ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data: any = await this.surveyService.getSurveyslistBySotId(
      params,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requested_list')
  async getRequestedSurveyList(
    @Query() query: RequestListDto,
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() user: User,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/requested_list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const surveyList = await this.surveyService.getRequestedSurveyList(
      query,
      user,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: surveyList,
    });
  }

  @Post('add_silver_bell_request')
  public async addSilverBellRequest(
    @Body() payload: SilverBellRequestDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST survey/add_silver_bell_request ${LoggerMessages.API_CALLED}`,
    );
    await this.surveyService.addSilverBellRequest(payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Survey Participation
  /*
  /********************************************************************************************************************/

  @UseGuards(AuthGuard('jwt'))
  @Post('submit_participation/:surveyId')
  async submitSurveyParticipation(
    @Param() params: SurveyParamDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Body() payload: SurveyParticipantDto,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/submit_participation/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const data: any = await this.surveyService.submitSurveyParticipation(
      params,
      user,
      payload,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Survey Participation List
  /*
  /********************************************************************************************************************/

  @Get('participation_list')
  async getSurveyParticipationList(
    @Query() query: ParticipationListDto,
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() user: User,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/participation_list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const surveyList = await this.surveyService.getSurveyParticipationList(
      query,
      user,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: surveyList,
    });
  }

  @Get('survey_detail/:surveyId')
  async surveyDetailById(
    @Param() params: SurveyParamDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/survey_detail/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const survey = await this.surveyService.getSurveyDetail(
      params.surveyId,
      user.uuid,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: survey,
    });
  }

  @Get('survey_options/:surveyId')
  async optionsBySurveyId(
    @Param() params: SurveyParamDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/survey_options/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const options = await this.surveyService.optionsBySurveyId(params.surveyId);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: options,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Survey Comment
  /*
  /********************************************************************************************************************/

  @Get('survey_comments/:surveyId')
  async commentsBySurveyId(
    @Query() query: SurveyCommentListDto,
    @Param() params: SurveyParamDto,
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() user: User,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/survey_comments/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const comments = await this.surveyService.commentsBySurveyId(
      params.surveyId,
      query,
      user,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: comments,
    });
  }

  @Post('add_comment/:surveyId')
  async addSurveyComment(
    @Param() params: SurveyParamDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Body() payload: AddSurveyCommentDto,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/add_comment/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const data: any = await this.surveyService.addSurveyComment(
      params,
      user,
      payload,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Post('toggle_like_comment/:commentId')
  async toggleLikeSurveyComment(
    @Param() params: CommentParamsDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/toggle_like_comment/:commentId ${LoggerMessages.API_CALLED}`,
    );
    const data: any = await this.surveyService.toggleLikeSurveyComment(
      params,
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Post('delete_comment/:commentId')
  async deleteSurveyComment(
    @Param() params: CommentParamsDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post survey/delete_comment/:commentId ${LoggerMessages.API_CALLED}`,
    );
    const data: any = await this.surveyService.deleteSurveyComment(
      params,
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   SURVEY CHART
  /*
  /********************************************************************************************************************/

  @Get('chart_by_gender/:surveyId')
  async genderChartBySurveyId(
    @Param() params: SurveyParamDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/chart_by_gender/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.genderChartBySurveyId(
      params.surveyId,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('total_participation_chart/:surveyId')
  async totalParticipationChartBySurveyId(
    @Param() params: SurveyParamDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/total_participation_chart/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.totalParticipationChartBySurveyId(
      params,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('chart_by_age/:surveyId')
  async ageChartBySurveyId(
    @Param() params: SurveyParamDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/chart_by_age/:surveyId ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.ageChartBySurveyId(params.surveyId);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('chart_by_option')
  async optionChartBySurveyId(
    @Query() query: SurveyOptionChartDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET survey/chart_by_option ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.optionChartBySurveyId(query);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
