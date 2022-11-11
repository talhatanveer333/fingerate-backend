import { Module } from '@nestjs/common';
import { AdminSomController } from './som.controller';
import { AdminSomService } from './som.service';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { UserModule } from '../../user/user.module';
import { AdminRewardModule } from '../reward/reward.module';
import { AdminRechargeModule } from '../recharge/recharge.module';
import { AdminPaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    LoggerModule,
    UserModule,
    AdminRewardModule,
    AdminRechargeModule,
    AdminPaymentModule,
  ],
  controllers: [AdminSomController],
  providers: [AdminSomService],
})
export class AdminSomModule { }
