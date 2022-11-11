import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRewardService } from './reward.service';
import { Response, Request } from 'express';
import { RewardUserHistoryDTO, SaveRewardDTO } from './common/reward.dtos';
import { LoggerService } from '../../../utils/logger/logger.service';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { EmailDto } from '../../auth/common/auth.dtos';
import { CurrentUser } from '../../../modules/common/decorator/current-user.decorator';
import { Admin } from '../admin/admin.entity';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/reward')
export class AdminRewardController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly adminRewardService: AdminRewardService,
  ) { }

  @Get('user_history')
  async getUserHistory(
    @Res() res: Response,
    @Req() req: Request,
    @Query() queryOptions: RewardUserHistoryDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/reward/user_history ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.adminRewardService.getUserHistory(
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('search_user/:email')
  async searchUser(
    @Res() res: Response,
    @Param('email') email: string,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/reward/search_user/:email ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminRewardService.searchUser(email);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    })
  }

  @Post('save')
  async saveReward(
    @Res() res: Response,
    @Body() payload: SaveRewardDTO,
    @CurrentUser() admin: Admin,
  ): Promise<Response> {
    this.loggerService.log(`POST admin/reward/save ${LoggerMessages.API_CALLED}`);
    const data = await this.adminRewardService.saveReward(admin, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    })
  }
}
