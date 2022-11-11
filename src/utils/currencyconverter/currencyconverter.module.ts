import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Price } from '../../modules/payment/price.entity';
import { LoggerModule } from '../../utils/logger/logger.module';
import { CoinGeckoMarket } from './coingecko.service';
import { CurrencyConverterService } from './currencyconverter.service';
import { ExchangeService } from './exchange.service';

@Module({
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([Price])
  ],
  providers: [CurrencyConverterService,ExchangeService,CoinGeckoMarket],
  exports: [CurrencyConverterService,ExchangeService,CoinGeckoMarket],
})
export class CurrencyConverterModule { }
