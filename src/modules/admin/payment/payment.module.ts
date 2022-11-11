import { Module } from '@nestjs/common';
import { AdminPaymentService } from './payment.service';
import { AdminPaymentController } from './payment.controller';
import { LoggerModule } from './../../../utils/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../payment/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    LoggerModule
  ],
  controllers: [AdminPaymentController],
  providers: [AdminPaymentService],
  exports: [AdminPaymentService]
})
export class AdminPaymentModule { }
