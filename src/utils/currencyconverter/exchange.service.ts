import { PaymentCurrrency } from '../../modules/payment/common/payment.enums';
import axios from 'axios';

export class ExchangeService {
    constructor() { }

    async getPrice(): Promise<number> {
        return new Promise<number>(async (resolve, reject) => {
            try {
                const url = process.env.EX_RATE_API_BASE_URL + `exchangerates_data/convert?to=${PaymentCurrrency.KOREAN_WAN}&from=${PaymentCurrrency.DOLLAR}&amount=1`
                const config = {
                    method: 'get',
                    url,
                    headers: {
                        apikey: process.env.EX_RATE_API_KEY
                    }
                }
                const response = await axios(config);
                const convertedPrice = response?.data?.result;
                resolve(Math.round(convertedPrice));
            } catch (err) {
                reject(err);
            }
        });
    }
}