import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { UserModule } from '../user/user.module';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '../../modules/worker/common/worker.enums';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventAttendance } from './eventattendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventAttendance]),
    LoggerModule,
    UserModule,
  ],
  controllers: [EventController],
  exports: [EventService],
  providers: [EventService],
})
export class EventModule {}
