import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { User } from './user.entity';
import { UsersService } from './user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ChangeNickNameDto,
  ChangePasswordDto,
  FcmTokenDto,
  NotificationSettingDto,
  TransactionFilterDto,
  WithdrawMembershipDto,
} from './common/user.dtos';
import { Response, Request } from 'express';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';
import { ItemColorsParamsDto } from '../../modules/marketplace/common/marketplace.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UsersService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('UserController');
  }

  @Get('me')
  public async getUserDetails(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(`Get user/me ${LoggerMessages.API_CALLED}`);
    const data = await this.userService.getUserDetails(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   EDIT PROFILE
  /*
  /********************************************************************************************************************/

  @Post('change_password')
  public async changePassword(
    @CurrentUser() user: User,
    @Body() payload: ChangePasswordDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post user/change_password ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.changePassword(user.email, user.loginType, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.PASS_CHANGE_SUCCESS,
    });
  }

  @Post('change_nickname')
  public async changeNickName(
    @CurrentUser() user: User,
    @Body() payload: ChangeNickNameDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post Post/change_nickname ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.changeNickName(user, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   withdraw Membership
  /*
  /********************************************************************************************************************/

  @Post('withdraw_membership')
  async withdrawMembership(
    @CurrentUser() user: User,
    @Body() payload: WithdrawMembershipDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST user/withdraw_membership ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.withdrawMembership(payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Referrals
  /*
  /********************************************************************************************************************/

  @Get('referrals')
  public async getUserAffiliates(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(`Get user/referrals ${LoggerMessages.API_CALLED}`);
    const referrals = await this.userService.getUserReferrals(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data: referrals,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   TRANSACTION
  /*
  /********************************************************************************************************************/

  @Get('transaction_history')
  public async getUserTransaction(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
    @Query() queryOption: TransactionFilterDto,
  ): Promise<Response> {
    this.loggerService.log(
      `Get user/transaction_history ${LoggerMessages.API_CALLED}`,
    );
    const transactions = await this.userService.getUserTransaction(
      user,
      queryOption,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: transactions,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Update FCM Token
  /*
  /********************************************************************************************************************/

  @Patch('update_fcm_token')
  public async updateFcmToken(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
    @Body() payload: FcmTokenDto,
  ): Promise<Response> {
    this.loggerService.log(
      `Post user/update_fcm_token ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.updateFcmToken(user, payload.token);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Notifications
  /*
  /********************************************************************************************************************/

  @Patch('update_notification_setting')
  public async updateUserNotificationSetting(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Body() payload: NotificationSettingDto,
  ): Promise<Response> {
    this.loggerService.log(
      `PATCH user/update_notification_setting ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.updateUserNotificationSetting(payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('unread_notification_count')
  public async getUserUnreadNotificationCount(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Get user/unread_notification_count ${LoggerMessages.API_CALLED}`,
    );
    const notificationCount =
      await this.userService.getUnreadUserNotificationCount(user.uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: notificationCount,
    });
  }

  @Get('get_notification')
  public async getUserNotification(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Get user/get_notification ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const notificationCount = await this.userService.getUserNotification(
      pagination,
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: notificationCount,
    });
  }

  @Delete('notification_history')
  async deleteUserNotificationHistory(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Delete user/notification_history ${LoggerMessages.API_CALLED}`,
    );
    await this.userService.deleteUserNotificationHistory(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  /********************************************************************************************************************/
  /*
  /*                                   Item Collection
  /*
  /********************************************************************************************************************/

  @Get('item_collection')
  async getUserItemColors(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Get user/item_collection ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.userService.getUserItemCollection(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
