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
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { User } from '../user/user.entity';
import { EventService } from './event.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { AttendanceDto, MonthlyAttendaceDto } from './common/event.dtos';

@UseGuards(AuthGuard('jwt'))
@Controller('api/event')
export class EventController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly eventService: EventService,
  ) {
    this.loggerService.setContext('EventController');
  }

  @Post('mark_attendance')
  async makeSurveyPayment(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST event/mark_attendance ${LoggerMessages.API_CALLED}`,
    );
    const data = await this.eventService.markAttendance(user);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data,
    });
  }

  @Get('monthly_attendance')
  public async getUserMonthlyAttendance(
    @CurrentUser() user: User,
    @Query() monthlyAttendaceDto: MonthlyAttendaceDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `Get event/monthly_attendance ${LoggerMessages.API_CALLED}`,
    );
    const UserAttendance = await this.eventService.getUserMonthlyAttendance(
      user,
      monthlyAttendaceDto,
    );
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
      data: UserAttendance,
    });
  }
}
