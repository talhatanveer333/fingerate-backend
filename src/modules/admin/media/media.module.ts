import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { MediaModule } from '../../media/media.module';

@Module({
  imports: [LoggerModule, MediaModule],
  controllers: [MediaController],
})
export class AdminMediaModule {}
