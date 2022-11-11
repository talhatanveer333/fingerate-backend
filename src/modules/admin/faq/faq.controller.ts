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
import { FaqService } from './faq.service';
import { Request, Response } from 'express';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../../utils/paginate';
import { FaqDTO, FAQListSearch } from './commons/faq.dto';
import { AuthGuard } from '@nestjs/passport';
import { UUIDDto } from '../../common/dtos/index.dtos';

@UseGuards(AuthGuard('admin_jwt'))
@Controller('api/admin/faq')
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AdminFAQController');
  }

  @Get('id/:uuid')
  public async getFAQ(
    @Res() res: Response,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(`GET admin/faq/id/:uuid ${LoggerMessages.API_CALLED}`);
    const data = await this.faqService.getFAQ(uuid);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Get('list')
  public async list(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: FAQListSearch,
  ) {
    this.loggerService.log(`GET admin/faq/list ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const data = await this.faqService.find(query, pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Post()
  public async create(@Res() res: Response, @Body() payload: FaqDTO) {
    this.loggerService.log(`POST admin/faq ${LoggerMessages.API_CALLED}`);
    const faq = await this.faqService.create(payload);
    return res.status(ResponseCode.CREATED_SUCCESSFULLY).send({
      statusCode: ResponseCode.CREATED_SUCCESSFULLY,
      message: ResponseMessage.CREATED_SUCCESSFULLY,
      faq,
    });
  }

  @Put('/:uuid')
  public async update(
    @Res() res: Response,
    @Body() payload: FaqDTO,
    @Param() { uuid }: UUIDDto,
  ) {
    this.loggerService.log(`PUT admin/faq ${LoggerMessages.API_CALLED}`);
    await this.faqService.update(uuid, payload);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
