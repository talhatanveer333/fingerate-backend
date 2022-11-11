import { AuthGuard } from '@nestjs/passport';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import {
  Controller,
  Param,
  Res,
  UseGuards,
  Get,
  Query,
  Body,
  Post,
  Req,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
import {
  AddItemsToCartDto,
  ItemColorsParamsDto,
  ItemsQueryDto,
} from './common/marketplace.dto';
import { MarketplaceService } from './marketplace.service';
import { UUIDDto } from '../../modules/common/dtos/index.dtos';
import { CurrentUser } from '../../modules/common/decorator/current-user.decorator';
import { User } from '../../modules/user/user.entity';

@Controller('api/marketplace')
@UseGuards(AuthGuard('jwt'))
export class MarketplaceController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly marketplaceService: MarketplaceService,
  ) {
    this.loggerService.setContext('MarketplaceController');
  }

  @Get('items')
  async getItems(
    @Query() query: ItemsQueryDto,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET marketplace/items ${LoggerMessages.API_CALLED}`,
    );
    const items = await this.marketplaceService.getMarketItems(query);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data: items,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('item_colors/:item_name')
  public async getColorsByItemName(
    @Param() params: ItemColorsParamsDto,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `GET marketplace/item_colors/:item_name ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.marketplaceService.getColorsByItemName(
      params.item_name,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('add_cart_item')
  public async addCartItem(
    @Body() payload: AddItemsToCartDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `POST marketplace/add_cart_item ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.marketplaceService.addCartItem(payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('cart_item')
  async getUserCartItems(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Get marketplace/cart_item ${LoggerMessages.API_CALLED}`,
    );
    const { avatarItems } = await this.marketplaceService.getUserCartItems(
      user,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: avatarItems,
    });
  }

  @Delete('delete_cart_item/:uuid')
  public async deleteItemFromUsercart(
    @Param() { uuid }: UUIDDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `DELETE marketplace/delete_cart_item/:uuid ${LoggerMessages.API_CALLED}`,
    );
    await this.marketplaceService.deleteItemFromUsercart(uuid, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Delete('delete_user_cart_item')
  async deleteUsercartItem(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Delete marketplace/delete_user_cart_item ${LoggerMessages.API_CALLED}`,
    );
    await this.marketplaceService.deleteUsercartItem(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post('checkout')
  public async itemsPayment(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Post marketplace/checkout ${LoggerMessages.API_CALLED}`,
    );
    await this.marketplaceService.checkout(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('virtual_try_items')
  public async virtualTry(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `GET marketplace/virtual_try_items ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.marketplaceService.virtualTryItems();
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
