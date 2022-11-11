import { Module } from '@nestjs/common';
import { EventBannerService } from './eventbanner.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventBannerController } from './eventbanner.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { MediaModule } from '../../media/media.module';
import { S3Module } from '../../../utils/s3/s3.module';
import { EventBanner } from './../../../modules/eventbanner/eventbanner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventBanner]),
    LoggerModule,
    MediaModule,
    S3Module,
  ],
  controllers: [EventBannerController],
  providers: [EventBannerService],
})
export class EventBannerModule {}
