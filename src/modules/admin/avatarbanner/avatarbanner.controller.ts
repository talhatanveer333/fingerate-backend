import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '../../../utils/logger/logger.service';
import { AvatarBannerService } from './avatarbanner.service';
import { Request, Response } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import {
  AvatarBannerDTO,
  AvatarBannerListSearch,
} from './commons/avatarbanner.dto';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/avatar_banner')
export class AvatarBannerController {
  constructor(
    private readonly avatarBannerService: AvatarBannerService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminAvatarBannerController');
  }

  @Get('id/:uuid')
  public async getAvatarBanner(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `GET admin/avatar_banner/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.avatarBannerService.getAvatarBanner(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('list')
  public async listAvatarBanners(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: AvatarBannerListSearch,
  ) {
    this.loggerService.log(
      `GET admin/avatar_banner/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.avatarBannerService.findAvatarBanner(
      query,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('create')
  public async createAvatarBanner(
    @Res() res: Response,
    @Body() payload: AvatarBannerDTO,
  ) {
    this.loggerService.log(
      `POST admin/avatar_banner/create ${LoggerMessages.API_CALLED}`,
    );
    const avatarBanner = await this.avatarBannerService.createAvatarBanner(
      payload,
    );
    return res.status(ResponseCode.CREATED_SUCCESSFULLY).send({
      statusCode: ResponseCode.CREATED_SUCCESSFULLY,
      message: ResponseMessage.CREATED_SUCCESSFULLY,
      avatarBanner,
    });
  }

  @Put('/:uuid')
  public async updateAvatarBanner(
    @Res() res: Response,
    @Body() payload: AvatarBannerDTO,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(
      `PUT admin/avatar_banner/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.avatarBannerService.updateAvatarBanner(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
