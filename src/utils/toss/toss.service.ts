import { Injectable, HttpException, Redirect } from '@nestjs/common';
import axios from 'axios';
import { ResponseCode, ResponseMessage } from '../../utils/enum';

@Injectable()
export class TossService {
  constructor() {}

  /**
   *Make Toss Payment
   * @param paymentKey
   * @param orderId
   * @param amount
   */
  async makePayment(paymentKey: string, orderId: string, amount: number) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const url = process.env.TOSS_API_BASE_URL + `v1/payments/confirm`;
        const data = {
          paymentKey,
          orderId,
          amount,
        };
        const config = {
          method: 'post',
          url,
          headers: {
            Authorization: this.getAuthorizatonToken(
              process.env.TOSS_STORE_KEY,
            ),
          },
          data,
        };
        await axios(config);
        resolve();
      } catch (error) {
        reject(
          new HttpException(
            {
              statusCode: ResponseCode.ERROR_IN_PAYMENT_TRANSACTION,
              message: ResponseMessage.ERROR_IN_PAYMENT_TRANSACTION,
            },
            ResponseCode.BAD_REQUEST,
          ),
        );
      }
    });
  }

  private getAuthorizatonToken(key: string) {
    return `Basic ${Buffer.from(key + ':').toString('base64')}`;
  }
}
