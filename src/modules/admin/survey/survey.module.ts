import { Module } from '@nestjs/common';
import { AdminSurveyService } from './survey.service';
import { AdminSurveyController } from './survey.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { S3Module } from '../../../utils/s3/s3.module';
import { SurveyModule } from '../../survey/survey.module';
import { UserModule } from '../../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SilverBellRequest } from '../../survey/silverbellrequest.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SilverBellRequest]),
    LoggerModule,
    S3Module,
    SurveyModule,
    UserModule],
  controllers: [AdminSurveyController],
  providers: [AdminSurveyService],
})
export class AdminSurveyModule { }
