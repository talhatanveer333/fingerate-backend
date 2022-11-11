import { HttpException, Injectable } from '@nestjs/common';
import { getManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletRecharge } from '../../payment/walletrecharge.entity';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';

@Injectable()
export class AdminRechargeService {
  constructor(
    @InjectRepository(WalletRecharge)
    private readonly rechargeRepo: Repository<WalletRecharge>,
  ) { }

  /**
   *
   * @param uuid
   */
  public async getRechargeDetails(uuid: string) {
    const sql = `
        SELECT
            U."email",
            U."nickName",
            WR."type",
            WR."amountInSom",
            null AS admin_email,
            null AS details
        FROM
            users AS U
        LEFT JOIN wallet_recharges AS WR ON WR."walletId" = U."walletId"
        WHERE
            WR."uuid" = '${uuid}'
        `;
    const result = await getManager().query(sql);
    return result;
  }
}
