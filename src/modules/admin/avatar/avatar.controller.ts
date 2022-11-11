import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  Req,
  UseGuards,
  Put,
  Param,
} from '@nestjs/common';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from './../../../utils/enum';
import { Request, Response } from 'express';
import { LoggerService } from './../../../utils/logger/logger.service';
import { AvatarService } from './avatar.service';
import { Pagination } from '../../../utils/paginate';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { AuthGuard } from '@nestjs/passport';
import { AvatarDTO, AvatarListDTO, UsersAvatarListDTO } from './common/avatar.dto';
import { UUIDDto } from './../../../modules/common/dtos/index.dtos';

@Controller('api/admin/avatar')
@UseGuards(AuthGuard('admin_jwt'))
export class AvatarController {
  constructor(
    private readonly avatarService: AvatarService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AvatarController');
  }

  @Post('create')
  public async createAvatar(@Res() res: Response, @Body() payload: AvatarDTO) {
    this.loggerService.log(
      `POST admin/avatar/create ${LoggerMessages.API_CALLED}`,
    );
    const avatar = await this.avatarService.createAvatar(payload);
    return res.status(ResponseCode.CREATED_SUCCESSFULLY).send({
      statusCode: ResponseCode.CREATED_SUCCESSFULLY,
      message: ResponseMessage.CREATED_SUCCESSFULLY,
      avatar,
    });
  }

  @Put('/:uuid')
  public async updateAvatar(
    @Res() res: Response,
    @Body() payload: AvatarDTO,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `PUT admin/avatar/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.avatarService.updateAvatar(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/list')
  public async getAvatars(
    @Req() req: Request,
    @Query() queryOptions: AvatarListDTO,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `GET admin/avatar/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.avatarService.getAllAvatars(
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/id/:uuid')
  public async getAvatarById(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/avatar/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.avatarService.getAvatarById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('user_avatar/list')
  public async getUsersAvatar(
    @Req() req: Request,
    @Query() queryOptions: UsersAvatarListDTO,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `GET admin/avatar/user_avatar/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.avatarService.getAllUsersAvatar(
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('/user_avatar/id/:uuid')
  public async getUserAvatarById(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/avatar/user-avatar/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.avatarService.getUserAvatarById(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }
  
  @Get('user_wishlist/:uuid')
  public async getUserWishlist(
    @Req() req: Request,
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/avatar/user_wishlist/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.avatarService.getUserWishlist(
      uuid,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }
}
