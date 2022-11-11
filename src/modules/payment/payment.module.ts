import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './payment.entity';
import { SurveyModule } from '../survey/survey.module';
import { UserModule } from '../user/user.module';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '../../modules/worker/common/worker.enums';
import { CurrencyConverterModule } from '../../utils/currencyconverter/currencyconverter.module';
import { TossModule } from '../../utils/toss/toss.module';
import { SotModule } from '../sot/sot.module';
import { PendingProfit } from './pendingprofit.entity';

@Module({
  imports: [
    SurveyModule,
    TypeOrmModule.forFeature([Payment, PendingProfit]),
    BullModule.registerQueueAsync({
      name: QueueName.DEFAULT,
    }),
    LoggerModule,
    UserModule,
    CurrencyConverterModule,
    TossModule,
    SotModule,
  ],
  controllers: [PaymentController],
  exports: [PaymentService],
  providers: [PaymentService],
})
export class PaymentModule {}
