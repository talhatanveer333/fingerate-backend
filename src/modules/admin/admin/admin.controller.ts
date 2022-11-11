import {
  Controller,
  Get,
  HttpException,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { LoggerService } from '../../../utils/logger/logger.service';
import { AdminService } from './admin.service';
import { Pagination } from '../../../utils/paginate';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { AdminListDTO } from './commons/admin.dtos';
import { UUIDDto } from './../../../modules/common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly adminService: AdminService,
  ) {
    this.loggerService.setContext('AdminController');
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Admin Management
  /*
  /********************************************************************************************************************/

  @Get('list')
  public async getAdmins(
    @Req() req: Request,
    @Query() queryOptions: AdminListDTO,
    @Res() res: Response,
  ) {
    this.loggerService.log(`GET admin/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.adminService.getAllAdmins(queryOptions, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/id/:uuid')
  public async adminDetail(
    @Param() { uuid }: UUIDDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.loggerService.log(`GET admin/id/:uuid ${LoggerMessages.API_CALLED}`);
    const admin = await this.adminService.adminDetail(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: admin,
    });
  }

  @Get('/history/:uuid')
  public async adminHistory(
    @Param() { uuid }: UUIDDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `GET admin/history/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const history = await this.adminService.adminHistory(uuid, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: history,
    });
  }
}
