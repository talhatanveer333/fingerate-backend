import { Module } from '@nestjs/common';
import { LoggerModule } from './../../../utils/logger/logger.module';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarItem } from '../../marketplace/avataritem.entity';
import { UserModule } from '../../../modules/user/user.module';
import { User } from '../../../modules/user';
import { S3Module } from '../../../utils/s3/s3.module';
import { UserAvatar } from '../../../modules/user/useravatar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvatarItem, User, UserAvatar]),
    LoggerModule,
    S3Module,
    UserModule,],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule { }
