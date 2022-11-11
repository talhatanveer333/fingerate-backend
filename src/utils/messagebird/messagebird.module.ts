import { Module } from '@nestjs/common';
import { MessageBirdService } from './messagebird.service';

@Module({
  imports: [],
  providers: [MessageBirdService],
  exports: [MessageBirdService],
})
export class MessagebirdModule {}
