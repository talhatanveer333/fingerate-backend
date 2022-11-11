import { Module } from '@nestjs/common';
import { SotService } from './sot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SotController } from './sot.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { Sot } from './../../../modules/sot/sot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sot]), LoggerModule],
  controllers: [SotController],
  providers: [SotService],
})
export class SotModule {}
