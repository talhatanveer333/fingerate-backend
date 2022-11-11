import { Module } from '@nestjs/common';
import { LoggerModule } from '../../utils/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './itemwishlist.controller';
import { WishlistService } from './itemwishlist.service';
import { UserItemWishlist } from './itemwishlist.entity';
import { MarketPlaceModule } from '../../modules/marketplace/marketplace.module';
import { S3Module } from '../../utils/s3/s3.module';

@Module({
  imports: [
    LoggerModule,
    MarketPlaceModule,
    TypeOrmModule.forFeature([UserItemWishlist]),
    S3Module,
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
