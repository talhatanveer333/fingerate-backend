import { Module } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticeController } from './notice.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { Notice } from '../../notice/notice.entity';
import { MediaModule } from '../../media/media.module';
import { S3Module } from '../../../utils/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notice]),
    LoggerModule,
    MediaModule,
    S3Module,
  ],
  controllers: [NoticeController],
  providers: [NoticeService],
})
export class NoticeModule {}
