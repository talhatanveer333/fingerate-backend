import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from '../../common/dtos/index.dtos';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { LoggerService } from '../../../utils/logger/logger.service';
import { AdminSurveyService } from './survey.service';
import { SurveyOptionChartDto } from './../../../modules/survey/common/survey.dtos';
import { ManagedSurveyListDTO, ManageSurveyStatusDTO, SurveyListDTO } from './commons/survey.dto';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { Request, Response } from 'express';
import { RegisterSurveyFromAdminDTO } from './commons/survey.dto';
import { CurrentUser } from '../../../modules/common/decorator/current-user.decorator';
import { Admin } from '../admin/admin.entity';

@Controller('api/admin/survey')
@UseGuards(AuthGuard('admin_jwt'))
export class AdminSurveyController {
  constructor(
    private readonly surveyService: AdminSurveyService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminSurveyController');
  }

  @Get('manage_survey/list')
  async getManageSurveyList(
    @Query() queryOptions: ManagedSurveyListDTO,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(`GET admin/survey/manage_survey/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.surveyService.getManageSurveyList(queryOptions, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data
    });
  }

  @Get('manage_survey/id/:uuid')
  async getManageSurveyById(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(`GET admin/survey/manage_survey/id/:uuid ${LoggerMessages.API_CALLED}`);
    const data = await this.surveyService.getManageSurveyById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Patch('manage_survey/:uuid')
  async manageSurveyChangeStatus(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
    @Body() { status }: ManageSurveyStatusDTO,
  ): Promise<Response> {
    this.loggerService.log(`PATCH admin/survey/manage_survey/:uuid ${LoggerMessages.API_CALLED}`);
    const data = await this.surveyService.manageSurveyChangeStatus(uuid, status);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    })
  }

  @Get('/id/:uuid')
  public async getSurveyById(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/survey/id/:id ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.getSurveyById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/chart_by_option/:uuid')
  public async getSurveyChartByOption(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/survey/chart_by_option ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.getSurveyChartByOption(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/list')
  public async getSurveyList(
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOptions: SurveyListDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/survey/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.surveyService.getSurveyList(
      pagination,
      queryOptions,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/filterData')
  public async getFilterData(@Res() res: Response): Promise<Response> {
    this.loggerService.log(
      `GET admin/survey/filterData ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.getFilterData();
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('survey_gender_statistics/:uuid')
  async getGenderStatisticsBySurveyId(
    @Param() { uuid }: UUIDDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/survey/survey_gender_statistics/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.genderStatisticsBySurveyId(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('survey_age_statistics/:uuid')
  async getAgeStatisticsBySurveyId(
    @Param() { uuid }: UUIDDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/survey/survey_age_statistics/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.ageStatisticsBySurveyId(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('survey_option_gender_statistics')
  async getoptionGenderStatisticsBySurveyId(
    @Query() query: SurveyOptionChartDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/survey/survey_option_gender_statistics ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.surveyService.optionGenderStatisticsBySurveyId(
      query,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Post()
  public async registerSurvey(
    @Res() res: Response,
    @CurrentUser() admin: Admin,
    @Body() payload: RegisterSurveyFromAdminDTO,
  ): Promise<Response> {
    this.loggerService.log(`POST admin/survey ${LoggerMessages.API_CALLED}`);
    const data = await this.surveyService.registerSurvey(payload, admin);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
