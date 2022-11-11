import { Module } from '@nestjs/common';
import { LoggerModule } from '../../utils/logger/logger.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Module } from '../../utils/s3/s3.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { UserModule } from '../../modules/user/user.module';
@Module({
  imports: [
    LoggerModule,
    S3Module,
    TypeOrmModule.forFeature([Media]),
    UserModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
