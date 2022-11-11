import { Module } from '@nestjs/common';
import { LoggerModule } from '../../utils/logger/logger.module';
import { WorkerProcessor } from './worker.processor';
import { SurveyModule } from '../../modules/survey/survey.module';
import { NotificationModule } from '../../utils/notification/notification.module';
import { MailModule } from '../../utils/mailer/mail.module';
import { UserModule } from '../../modules/user';
import { EventEmitter } from './event.emitter';
@Module({
  imports: [
    LoggerModule,
    SurveyModule,
    NotificationModule,
    MailModule,
    UserModule,
  ],
  exports: [WorkerProcessor, EventEmitter],
  providers: [WorkerProcessor, EventEmitter],
})
export class WorkerModule {}
