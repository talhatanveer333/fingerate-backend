import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { EventBannerController } from './eventbanner.controller';
import { EventBannerService } from './eventbanner.service';
import { EventBanner } from './eventbanner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventBanner]), LoggerModule],
  controllers: [EventBannerController],
  exports: [EventBannerService],
  providers: [EventBannerService],
})
export class EventBannerModule {}
