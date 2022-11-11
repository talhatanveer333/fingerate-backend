import { Module } from '@nestjs/common';
import { AdminRewardService } from './reward.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from '../../payment/reward.entity';
import { AdminRewardController } from './reward.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reward]), LoggerModule, UserModule],
  controllers: [AdminRewardController],
  providers: [AdminRewardService],
  exports: [AdminRewardService],
})
export class AdminRewardModule {}
