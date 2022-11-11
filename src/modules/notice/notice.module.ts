import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { Notice } from './notice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notice]), LoggerModule],
  controllers: [NoticeController],
  exports: [NoticeService],
  providers: [NoticeService],
})
export class NoticeModule {}
