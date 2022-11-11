import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { AvatarBannerController } from './avatarbanner.controller';
import { AvatarBannerService } from './avatarbanner.service';
import { AvatarBanner } from './avatarbanner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AvatarBanner]), LoggerModule],
  controllers: [AvatarBannerController],
  exports: [AvatarBannerService],
  providers: [AvatarBannerService],
})
export class AvatarBannerModule {}