import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqController } from './faq.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { FAQ } from '../../faq/faq.entity';
import { MediaModule } from '../../media/media.module';
import { S3Module } from '../../../utils/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FAQ]),
    LoggerModule,
    MediaModule,
    S3Module,
  ],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
