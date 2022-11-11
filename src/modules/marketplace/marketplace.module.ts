import { Module } from '@nestjs/common';
import { LoggerModule } from '../../utils/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarItem } from './avataritem.entity';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { Cart } from './cart.entity';
import { CartItem } from './cartitem.entity';
import { UserModule } from '../../modules/user/user.module';
import { PaymentModule } from '../payment/payment.module';
import { Order } from './order.entity';
import { OrderItem } from './orderitem.entity';
import { S3Module } from '../../utils/s3/s3.module';
@Module({
  imports: [
    LoggerModule,
    UserModule,
    PaymentModule,
    S3Module,
    TypeOrmModule.forFeature([AvatarItem, Cart, CartItem, Order, OrderItem]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketPlaceModule {}
