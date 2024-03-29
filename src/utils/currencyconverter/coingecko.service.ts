import { CoinGeckoClient, SimplePriceResponse } from 'coingecko-api-v3';

export class CoinGeckoMarket {
  private readonly coinGeckoClient: CoinGeckoClient;
  constructor() {
    this.coinGeckoClient = new CoinGeckoClient({
      timeout: 10000,
      autoRetry: true,
    });
  }

  /**
   * Ping the geckocoin market
   * @returns
   */
  public async ping(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await this.coinGeckoClient.ping();
        resolve(true);
      } catch (err) {
        reject(false);
      }
    });
  }

  /**
   * Get price of klay from coin market
   * @returns
   */
  public async getPrice(currency: string): Promise<SimplePriceResponse> {
    return new Promise<SimplePriceResponse>(async (resolve, reject) => {
      try {
        const ping = await this.ping();
        if (!ping) {
          return reject();
        }
        const marketPrice = await this.coinGeckoClient.simplePrice({
          ids: currency,
          vs_currencies: 'usd',
          include_last_updated_at: true,
        });
        resolve(marketPrice);
      } catch (err) {
        reject(err);
      }
    });
  }
}
