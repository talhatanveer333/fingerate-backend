import { Module } from '@nestjs/common';
import { TossService } from './toss.service';

@Module({
  providers: [TossService],
  exports: [TossService],
})
export class TossModule {}
