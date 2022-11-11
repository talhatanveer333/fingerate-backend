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
  Param,
  Post,
  Res,
  Req,
  UseGuards,
  Get,
  Delete,
  Put,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from '../user/user.entity';
import { UUIDDto } from '../../modules/common/dtos/index.dtos';
import { WishlistService } from './itemwishlist.service';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';

@UseGuards(AuthGuard('jwt'))
@Controller('api/wishlist')
export class WishlistController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly wishlistService: WishlistService,
  ) {
    this.loggerService.setContext('WishlistController');
  }

  @Post('add_item/:uuid')
  async addItemToUserWishlist(
    @Param() { uuid }: UUIDDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post wishlist/add_item/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.wishlistService.addItemToUserWishlist(uuid, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('user_wishlist')
  async getUserWishlist(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Get wishlist/user_wishlist ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data: any = await this.wishlistService.getUserWishlist(
      pagination,
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Delete('delete_wishlist_item/:uuid')
  public async deleteFromWishlist(
    @Param() { uuid }: UUIDDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `DELETE wish_list/delete_wishlist_item/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.wishlistService.deleteFromWishlist(uuid, user.uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
  
  @Delete('delete_user_wishlist')
  async deleteUserWishlist(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Delete wishlist/delete_user_wishlist ${LoggerMessages.API_CALLED}`,
    );
    await this.wishlistService.deleteUserWishlist(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
