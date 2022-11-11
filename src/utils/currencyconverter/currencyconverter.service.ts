import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Price } from '../../modules/payment/price.entity';
import { Repository } from 'typeorm';
import { JOB, ResponseMessage } from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';
import { CoinGeckoCurrrency, PaymentCurrrency } from '../../modules/payment/common/payment.enums';
import dayjs from 'dayjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeService } from './exchange.service';
import { CoinGeckoMarket } from './coingecko.service';

@Injectable()
export class CurrencyConverterService {
  static wanPrice: number;
  static msotPrice: number;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly exchangeService: ExchangeService,
    private readonly coinGeckoService: CoinGeckoMarket,
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>
  ) {
    this.loggerService.setContext('CurrencyConverterService');
    (async () => {
      await this.initWanPrice();
    })();
    (async () => {
      await this.initMsotPrice();
    })();
  }

  /**
   * Get Latest Wan Price Against Dollar
   * @returns 
   */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: JOB.WAN_PRICE_TO_USD,
  })
  async getWanPrice(): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        const convertedPrice = await this.exchangeService.getPrice();
        await this.saveWanPrice(convertedPrice);
        CurrencyConverterService.wanPrice = convertedPrice;
        resolve(CurrencyConverterService.wanPrice);
      } catch (err) {
        this.loggerService.error(ResponseMessage.ERROR_CURRENCY_CONVERSION);
      }
    });
  }

  /**
  * Get Latest Msot Price Against Dollar
  * @returns 
  */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: JOB.MSOT_PRICE_TO_USD,
  })
  async getMsotPrice(): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        const msotMarketPrice = await this.coinGeckoService.getPrice(CoinGeckoCurrrency.MSOT);
        await this.saveMsotPrice(msotMarketPrice[CoinGeckoCurrrency.MSOT].usd);
        CurrencyConverterService.msotPrice = msotMarketPrice[CoinGeckoCurrrency.MSOT].usd;
        resolve(CurrencyConverterService.msotPrice);
      } catch (err) {
        this.loggerService.error(ResponseMessage.UNABLE_TO_PING_COINMARKET);
      }
    });
  }

  /**
   * Save Wan latest price
   * @param price
   * @returns
   */
  public async saveWanPrice(price: number): Promise<void> {
    const previousPrice = await this.getPrice(PaymentCurrrency.KOREAN_WAN);
    if (!previousPrice) {
      const newPrice = new Price();
      newPrice.key = PaymentCurrrency.KOREAN_WAN;
      newPrice.price = price;
      this.loggerService.log(`Get Wan latest price at ${dayjs().unix()}`);
      await this.priceRepository.save(newPrice);
    }
    else {
      previousPrice.price = price;
      await this.priceRepository.save(previousPrice);
    }
    return;
  }

  /**
   * Save MSOT latest price
   * @param price
   * @returns
   */
  public async saveMsotPrice(price: number): Promise<number> {
    const previousPrice = await this.getPrice(CoinGeckoCurrrency.MSOT);
    if (!previousPrice) {
      const newPrice = new Price();
      newPrice.price = price;
      newPrice.key = CoinGeckoCurrrency.MSOT;
      this.loggerService.log(`Get Msot latest price at ${dayjs().unix()}`);
      await this.priceRepository.save(newPrice);
    }
    else {
      previousPrice.price = price;
      await this.priceRepository.save(previousPrice);
    }
    return;
  }

  /**
   * Get price of currency
   * @param key string
   * @returns price
   */
  public async getPrice(key: string): Promise<Price> {
    return await this.priceRepository.findOne({ key });
  }


  /**
   * Initailize wan price on startup
   */
  public async initWanPrice() {
    try {
      const previousPrice = await this.getPrice(PaymentCurrrency.KOREAN_WAN);
      if (!previousPrice) {
        this.loggerService.log(`Get wan latest price on startup`);
        const wanPrice = await this.getWanPrice();
        CurrencyConverterService.wanPrice = wanPrice;
      } else {
        CurrencyConverterService.wanPrice = previousPrice.price;
      }
      return;
    } catch (err) {
      this.loggerService.error(ResponseMessage.UNABLE_TO_PING_EXCHANGE_SERVICE);
    }
  }


  /**
   * Initailize Msot price on startup
   */
  public async initMsotPrice() {
    try {
      const previousPrice = await this.getPrice(CoinGeckoCurrrency.MSOT);
      if (!previousPrice) {
        this.loggerService.log(`Get Msot latest price on startup`);
        const msotPrice = await this.getMsotPrice();
        CurrencyConverterService.msotPrice = msotPrice;
      } else {
        CurrencyConverterService.msotPrice = previousPrice.price;
      }
      return;
    } catch (err) {
      this.loggerService.error(ResponseMessage.UNABLE_TO_PING_COINMARKET);
    }
  }
}
