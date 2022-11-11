import { Module } from '@nestjs/common';
import { AvatarBannerService } from './avatarbanner.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarBannerController } from './avatarbanner.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { MediaModule } from '../../media/media.module';
import { S3Module } from '../../../utils/s3/s3.module';
import { AvatarBanner } from '../../avatarbanner/avatarbanner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvatarBanner]),
    LoggerModule,
    MediaModule,
    S3Module,
  ],
  controllers: [AvatarBannerController],
  providers: [AvatarBannerService],
})
export class AvatarBannerModule {}
