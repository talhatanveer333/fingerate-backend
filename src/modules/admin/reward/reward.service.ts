import { HttpException, Injectable } from '@nestjs/common';
import { getManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Reward } from '../../payment/reward.entity';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { RewardUserHistoryDTO, SaveRewardDTO } from './common/reward.dtos';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { IRewardHistoryFilters } from './common/reward.types';
import { UsersService } from '../../user/user.service';
import { Admin } from '../admin/admin.entity';
import dayjs from 'dayjs';

@Injectable()
export class AdminRewardService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
    private readonly userService: UsersService,
  ) { }

  /**
   *
   * @param admin
   * @param email
   * @param payload
   */
  public async saveReward(admin: Admin, payload: SaveRewardDTO) {
    const user = await this.userService.get(payload.uuid);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const reward = new Reward();
    reward.wallet = user.wallet;
    reward.reason = payload.reason;
    reward.amount = +payload.som;
    reward.type = payload.type;
    reward.expiredAt = dayjs().add(3, 'months').unix();
    reward.admin = admin;
    await this.rewardRepo.save(reward);
    return;
  }

  /**
   *
   * @param email
   */
  public async searchUser(email: string) {
    const users = await this.userService.searchByEmail(email);
    return users;
  }

  /**
   *
   * @param uuid
   * @returns
   */
  public async getRewardDeatils(uuid: string) {
    const sql = `
        SELECT
            U."email",
            U."nickName",
            R."type",
            R."amount",
            A."email" AS admin_email,
            R."reason"
        FROM
	        users AS U
        INNER JOIN rewards AS R ON R."walletId" = U."walletId"
        LEFT JOIN admins AS A ON A."uuid" = R."adminId"::uuid
        WHERE
	        R."uuid" = '${uuid}'
        `;
    const reward = await getManager().query(sql);
    return reward;
  }
  /**
   * nodejsnodejs
   *
   * @param queryOptions
   * @param pagination
   * @returns
   */
  public async getUserHistory(
    queryOptions: RewardUserHistoryDTO,
    pagination: IPaginationOptions,
  ) {
    const format: IRewardHistoryFilters = {
      email: queryOptions.email
        ? ` AND U."email" LIKE '%${queryOptions.email}%'`
        : '',
      nickName: queryOptions.nickName
        ? ` AND U."nickName" LIKE '%${queryOptions.nickName}%'`
        : '',
      adminEmail: queryOptions.adminEmail
        ? ` AND A."email" LIKE '%${queryOptions.adminEmail}%'`
        : '',
      type: queryOptions.type
        ? ` AND R."type" LIKE '%${queryOptions.type}%'`
        : '',
    };
    const filter = Object.values(format).join('');
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);
    const sql = `
        SELECT 
            R."uuid",
            TO_CHAR(TO_TIMESTAMP(R."createdAt"), 'DD/MM/YYYY') as date,
            U."email",
            U."nickName",
            R."amount",
            A."email" AS admin_email
        FROM
	        users AS U  
        INNER JOIN rewards AS R ON R."walletId" = U."walletId"
        LEFT JOIN admins AS A ON A."uuid" = R."adminId"
        WHERE
	        1=1
            ${filter}
        ORDER BY R."createdAt" DESC
        LIMIT $1 OFFSET $2
        `;
    const result = await getManager().query(sql, [limit, limit * (page - 1)]);
    const totalSql = `
        SELECT 
            COUNT(*) as count
        FROM
	        users AS U  
        INNER JOIN rewards AS R ON R."walletId" = U."walletId"
        LEFT JOIN admins AS A ON A."uuid" = R."adminId"::uuid
        WHERE
	        1=1
            ${filter}
        `;
    const { count } = (await getManager().query(totalSql))[0];
    return {
      records: result,
      meta: { totalCount: count },
    };
  }

  /**
   *
   * @param uuid
   */
  public async getDetails(uuid: string) {
    const sql = `
        SELECT
            *
        FROM
	        rewards AS R
        LEFT JOIN surveys AS S ON S."uuid" = R."survey"::uuid
        WHERE
	        R."uuid" = '${uuid}'
        `;

    return await getManager().query(sql);
  }
}
