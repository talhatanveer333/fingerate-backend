import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { LoggerService } from '../../../utils/logger/logger.service';
import { Pagination } from '../../../utils/paginate';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Request, Response } from 'express';
import { AdminUserService } from './user.service';
import { Admin } from '../admin';
import { UserListDTO } from '../admin/commons/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserGraphStatDTO, UserStatusUpdateDTO } from './commons/user.dto';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/user')
export class AdminUserController {
  constructor(
    private readonly userService: AdminUserService,
    private readonly loggerService: LoggerService,
  ) {}

  @Get('/list')
  async getUserslist(
    @CurrentUser() admin: Admin,
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOptions: UserListDTO,
  ) {
    this.loggerService.log(`GET admin/user/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.userService.getUsersList(queryOptions, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/id/:uuid')
  async getById(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/users/id/:id ${LoggerMessages.API_CALLED}`,
    );
    const result = await this.userService.getById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: result,
    });
  }

  @Get('/graph_stats')
  async getGraphStats(
    @Res() res: Response,
    @Query() queryOptions: UserGraphStatDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET /admin/user/graph_stats ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.userService.getGraphStats(queryOptions);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/referrals/:uuid')
  async getReferrals(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/user/referrals/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.userService.getReferrals(pagination, uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/purchases/:uuid')
  async getPurchases(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/user/purchases/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.userService.getPurchases(pagination, uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Patch('/status/:uuid')
  async updateUserStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
    @Body() payload: UserStatusUpdateDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `PATCH admin/user/status/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.updateUserStatus(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
