import { Module } from '@nestjs/common';
import { UserModule } from '../../modules/user/user.module';
import { LoggerModule } from '../../utils/logger/logger.module';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotification } from '../../modules/user/notification.entity';

@Module({
  imports: [
    LoggerModule,
    UserModule,
    TypeOrmModule.forFeature([UserNotification]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
