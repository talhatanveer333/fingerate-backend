import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FAQ } from './faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FAQ]), LoggerModule],
  controllers: [FaqController],
  exports: [FaqService],
  providers: [FaqService],
})
export class FaqModule {}
