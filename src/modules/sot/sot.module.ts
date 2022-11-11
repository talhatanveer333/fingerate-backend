import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { SotController } from './sot.controller';
import { SotService } from './sot.service';
import { Sot } from './sot.entity';
import { UserModule } from '../../modules/user/user.module';
import { SotDataService } from './sot.data.service';
import { BullModule } from '@nestjs/bull';
import { BlockQueue } from './common/sot.enums';
import { SotBlock } from './sot.block.entity';
import { BlockProcessor } from './block.processor.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sot, SotBlock]),
    UserModule,
    LoggerModule,
    BullModule.registerQueueAsync({
      name: BlockQueue.BLOCK,
    }),
  ],
  controllers: [SotController],
  exports: [SotService, SotDataService, BlockProcessor],
  providers: [SotService, SotDataService, BlockProcessor],
})
export class SotModule {}
