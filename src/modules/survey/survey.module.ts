import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { Survey } from './survey.entity';
import { UserModule } from '../user/user.module';
import { SotModule } from '../../modules/sot/sot.module';
import { MailModule } from '../../utils/mailer/mail.module';
import { SurveyOption } from './surveyoptions.entity';
import { MediaModule } from '../media/media.module';
import { VerifiedEmail } from '../verified-email/verifiedemail.entity';
import { SotSurvey } from './sotsurvey.entity';
import { SurveyParticipant } from './surveyparticipant.entity';
import { SurveyComment } from './surveycomment.entity';
import { S3Module } from '../../utils/s3/s3.module';
import { SurveyCommentLike } from './surveycommentlike.entity';
import { SilverBellRequest } from './silverbellrequest.entity';
import { Reward } from '../payment/reward.entity';
import { UserWallet } from '../user/userwallet.entity';
import { UserNotification } from '../user/notification.entity';
import { NotificationModule } from '../../utils/notification/notification.module';
import { EventModule } from '../event/event.module';
import { VerifiedEmailModule } from '../verified-email/verifiedemail.module';
@Module({
  imports: [
    SotModule,
    UserModule,
    LoggerModule,
    MailModule,
    TypeOrmModule.forFeature([
      Survey,
      SurveyOption,
      VerifiedEmail,
      SotSurvey,
      SurveyParticipant,
      SurveyComment,
      SurveyCommentLike,
      SilverBellRequest,
      Reward,
      UserWallet,
      UserNotification,
    ]),
    SotModule,
    UserModule,
    LoggerModule,
    MediaModule,
    S3Module,
    NotificationModule,
    EventModule,
    VerifiedEmailModule,
  ],
  controllers: [SurveyController],
  exports: [SurveyService],
  providers: [SurveyService],
})
export class SurveyModule {}
