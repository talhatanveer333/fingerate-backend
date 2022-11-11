import { Module } from '@nestjs/common';
import { AdminUserService } from './user.service';
import { AdminUserController } from './user.controller';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/user/user.entity';
import { UserModule } from '../../../modules/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), LoggerModule, UserModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
