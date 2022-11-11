import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { Controller, Get, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { FaqService } from './faq.service';
import { AuthGuard } from '@nestjs/passport';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { Pagination } from '../../utils/paginate';

@Controller('api/faq')
export class FaqController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly faqService: FaqService,
  ) {
    this.loggerService.setContext('FaqController');
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    FAQs APIs
  /*
  /********************************************************************************************************************/
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async find(@Res() res: Response, @Req() req: Request): Promise<Response> {
    this.loggerService.log(`GET faq/ ${LoggerMessages.API_CALLED}`);
    const pagination: IPaginationOptions = await Pagination.paginate(req, res);
    const faqs = await this.faqService.find(pagination);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: faqs,
    });
  }
}
