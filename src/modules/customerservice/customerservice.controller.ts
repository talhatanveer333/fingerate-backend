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
import { CustomerService } from './customerservice.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from '../user/user.entity';
import {
  InquiryParamDto,
  RegisterInquiryDto,
  EditInquiryDto,
} from './common/customerservice.dtos';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';
import { Inquiry } from './inquiry.entity';
import { S3KeyDto } from '../../modules/media/commons/media.dto';
import { isUUID } from 'class-validator';

@UseGuards(AuthGuard('jwt'))
@Controller('api/customer_service')
export class CustomerServiceController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly customerService: CustomerService,
  ) {
    this.loggerService.setContext('CustomerServiceController');
  }

  @Post('register_inquiry')
  async customerRegisterInquiry(
    @Body() payload: RegisterInquiryDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST customer_service/register_inquiry ${LoggerMessages.API_CALLED}`,
    );
    await this.customerService.registerInquiry(payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('inquiries_list')
  async getInquiriesList(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Get customer_service/inquiries_list ${LoggerMessages.API_CALLED}`,
    );
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.customerService.getInquiriesList(pagination, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Put('edit_inquiry/:inquiryId')
  async editInquiry(
    @Param() inquiryParam: InquiryParamDto,
    @Body() payload: EditInquiryDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Post customer_service/edit_inquiry/:inquiryId ${LoggerMessages.API_CALLED}`,
    );
    await this.customerService.editInquiry(inquiryParam, payload, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Delete('inquiry/:inquiryId')
  async deleteInquiry(
    @Param() inquiryParam: InquiryParamDto,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    this.loggerService.log(
      `Delete customer_service/inquiry/:inquiryId ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.customerService.deleteInquiry(inquiryParam, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Delete('delete_inquiry_attachment/:id')
  public async deleteImage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    this.loggerService.log(
      `DELETE customer_service/delete_inquiry_attachment/:id ${LoggerMessages.API_CALLED}`,
    );
    if (!isUUID(id)) {
      throw new HttpException(
        ResponseMessage.INVALID_ATTACHMENT_ID,
        ResponseCode.INVALID_ATTACHMENT_ID,
      );
    }
    await this.customerService.deleteInquiryAttachment(id, user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('inquiry/:inquiryId')
  async getInquiryById(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
    @Param() params: InquiryParamDto,
  ): Promise<Response> {
    this.loggerService.log(
      `Get customer_service/inquiry/:inquiryId ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.customerService.getInquirybyIdAndUser(
      params.inquiryId,
      user,
      false,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }
}
