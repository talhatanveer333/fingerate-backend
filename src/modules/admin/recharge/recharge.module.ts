import { Module } from '@nestjs/common';
import { AdminRechargeService } from './recharge.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletRecharge } from '../../payment/walletrecharge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WalletRecharge])],
  providers: [AdminRechargeService],
  exports: [AdminRechargeService],
})
export class AdminRechargeModule {}
