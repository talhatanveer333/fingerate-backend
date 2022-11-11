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
import { LoggerService } from '../../../utils/logger/logger.service';
import { AdminCustomerService } from './customerservice.service';
import { Response, Request } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import {
  ListInquiryDTO,
  RegisterInquiryReplyDTO,
} from './common/customerservice.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../modules/common/decorator/current-user.decorator';
import { Admin } from '../admin/admin.entity';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/customerservice')
export class AdminCustomerServiceController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly adminCustomerService: AdminCustomerService,
  ) {
    this.loggerService.setContext('AdminCustomerServiceController');
  }

  @Post('reply')
  async doReply(
    @Res() res: Response,
    @CurrentUser() admin: Admin,
    @Body() payload: RegisterInquiryReplyDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/customerservice/reply ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminCustomerService.doReply(payload, admin);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('list')
  async getList(
    @Res() res: Response,
    @Req() req: Request,
    @Query() queryOptions: ListInquiryDTO,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/customerservice/list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.adminCustomerService.getList(
      queryOptions,
      pagination,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('/id/:uuid')
  async getDetails(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ): Promise<Response> {
    this.loggerService.log(
      `GET admin/customerservice/id/:uuid ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.adminCustomerService.getDetails(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
