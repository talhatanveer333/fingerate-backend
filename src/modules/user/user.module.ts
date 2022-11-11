import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './user.service';
import { UserAvatar } from './useravatar.entity';
import { LoggerModule } from '../../utils/logger/logger.module';
import { UserController } from './user.controller';
import { UserWallet } from './userwallet.entity';
import { UserNotificationSetting } from './notificationsetting.entity';
import { UserSessionInfo } from './usersessioninfo.entity';
import { UserNotification } from './notification.entity';
import { CacheManagerModule } from './../cache-manager/cache-manager.module';
import { UserStatusHistory } from './user-status-history.entity';
import { UserItemCollection } from './useritemcollection.entity';
import { S3Module } from '../../utils/s3/s3.module';
import { UserRespectPolicy } from './userrespectpolicy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserAvatar,
      UserWallet,
      UserNotificationSetting,
      UserSessionInfo,
      UserNotification,
      UserStatusHistory,
      UserItemCollection,
      UserRespectPolicy
    ]),
    S3Module,
    CacheManagerModule,
    LoggerModule,
  ],
  controllers: [UserController],
  exports: [UsersService],
  providers: [UsersService],
})
export class UserModule { }
