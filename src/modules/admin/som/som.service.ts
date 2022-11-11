import { HttpException, Injectable } from '@nestjs/common';
import {
  paymentOrRewardDTO,
  SomStatisticsDTO,
  SomUserHistoryDTO,
  SomUserListDTO,
} from './common/som.dtos';
import {
  ISomUserHistoryFilters,
  ISomUserListFilters,
  ISomStatsDataObject,
} from './common/som.types';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { getManager, LessThan } from 'typeorm';
import { UsersService } from '../../user/user.service';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { AdminRewardService } from '../reward/reward.service';
import { AdminRechargeService } from '../recharge/recharge.service';
import { TransactionType } from './common/som.enum';
import { AdminPaymentService } from '../payment/payment.service';
@Injectable()
export class AdminSomService {
  constructor(
    private readonly userService: UsersService,
    private readonly adminRewardService: AdminRewardService,
    private readonly adminRechargeService: AdminRechargeService,
    private readonly adminPaymentService: AdminPaymentService,
  ) { }

  public async getPaymentOrReward(uuid: string, type: string) {
    let result;
    if (type === TransactionType.REWARD) {
      result = await this.adminRewardService.getRewardDeatils(uuid);
    } else if (type === TransactionType.SURVEY_PAYMENT) {
      result = await this.adminPaymentService.getSurveyPaymentDetails(uuid);
    } else if (type === TransactionType.ITEM_PAYMENT) {
      result = await this.adminPaymentService.getItemPaymentDetails(uuid);
    } else if (type === TransactionType.RECHARGE) {
      result = await this.adminRechargeService.getRechargeDetails(uuid);
    }
    if (!result?.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.PAYMENT_DETAILS_NOT_EXISTS,
          message: ResponseMessage.PAYMENT_DETAILS_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return result;
  }

  /**
   *
   * @param uuid
   * @param queryOptions
   * @param pagination
   * @returns
   */
  public async getUserHistory(
    uuid: string,
    queryOptions: SomUserHistoryDTO,
    pagination: IPaginationOptions,
  ) {
    const { walletId } = await this.getUserDetails(uuid);
    let type;
    if (queryOptions.type && queryOptions.type === TransactionType.REWARD.toString()) {
      type = ` AND view."table_name" = '${queryOptions.type}'`;
    }
    else if (queryOptions.type && [TransactionType.ITEM_PAYMENT.toString(), TransactionType.SURVEY_PAYMENT.toString(), TransactionType.RECHARGE.toString()].includes(queryOptions.type)) {
      type = ` AND view."table_name" = 'payment' AND view."type" = '${queryOptions.type}'`;
    }
    const format: ISomUserHistoryFilters = {
      type,
      startDate: queryOptions.start_date ? ` AND view."trx_date" >= ${queryOptions.start_date}` : ``,
      endDate: queryOptions.end_date ? ` AND view."trx_date" <= ${queryOptions.end_date}` : ``
    };
    const filter = Object.values(format).join('');
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);
    const sql = `
    SELECT
      view."walletId",
      view."trx_date",
      view."type",
      view."amount"
    FROM
      payment_reward_view AS view
    WHERE
      view."walletId" = '${walletId}'
      ${filter}
    ORDER BY trx_date DESC
    LIMIT $1 OFFSET $2
        `;
    const records = await getManager().query(sql, [limit, limit * (page - 1)]);
    const totalSql = `
    SELECT COUNT(*)
    FROM
      payment_reward_view AS view
    WHERE
      view."walletId" = '${walletId}'
      ${filter}
        `;
    const { count } = (await getManager().query(totalSql))[0];
    return {
      records,
      meta: { totalCount: count },
    };
  }

  /**
   *
   * @param uuid
   * @returns
   */
  public async getUserDetails(userUuid: string) {
    const user = await this.userService.get(userUuid);
    if (!user) {
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const {
      uuid,
      email,
      nickName,
      phoneNumber,
      wallet: { uuid: walletId },
    } = user;
    return { uuid, email, nickName, phoneNumber, walletId };
  }

  /**
   *
   * @param queryOptions
   * @param pagination
   * @returns
   */
  public async getUserList(
    queryOptions: SomUserListDTO,
    pagination: IPaginationOptions,
  ) {
    const format: ISomUserListFilters = {
      email: queryOptions.email
        ? `AND U."email" LIKE '%${queryOptions.email}%'`
        : '',
      nickName: queryOptions.nickName
        ? `AND U."nickName" LIKE '%${queryOptions.nickName}%'`
        : '',
      phoneNumber: queryOptions.phoneNumber
        ? `AND U."phoneNumber" LIKE '%${queryOptions.phoneNumber}%'`
        : '',
    };
    const filter = Object.values(format).join('');
    const page = Number(pagination.page);
    const limit = Number(pagination.limit);
    const sql = `
        SELECT
            U."uuid",
            TO_CHAR(TO_TIMESTAMP(U."createdAt"), 'DD/MM/YYYY') AS date,
            U."email",
            U."nickName",
            U."phoneNumber",
            UW."balance"
        FROM 
	        users as U
        LEFT JOIN users_wallets AS UW ON U."walletId" = UW."uuid"
        WHERE
	        1=1 ${filter}
        ORDER BY U."createdAt" DESC
        LIMIT $1 OFFSET $2
        `;
    const records = await getManager().query(sql, [limit, limit * (page - 1)]);

    const totalSql = `
        SELECT
            COUNT(*) as count
        FROM 
	        users as U
        WHERE
	        1=1 ${filter}
        `;
    const { count } = (await getManager().query(totalSql))[0];
    return {
      records,
      meta: {
        totalCount: count,
      },
    };
  }

  /**
   * Get Som Statistics
   *
   * @params queryOptions
   * @returns graphStatsDataObject
   */
  public async getSomStatistics(queryOptions: SomStatisticsDTO) {
    const { total_som: totalSOM } = await this.getTotalSOM();
    const { total_purchased_som: totalPurchasedSOM } =
      await this.getTotalPurchasedSOM();
    const { total_rewards_som: totalRewardSOM } =
      await this.getTotalRewardSOM();
    const graphSOM = await this.getSOMGraphData(queryOptions);
    const graphStatsDataObject: ISomStatsDataObject = {
      totalSOM,
      totalPurchasedSOM,
      totalRewardSOM,
      graphSOM,
    };
    return graphStatsDataObject;
  }

  /**
   * gets the total SOM query
   *
   * @returns total SOM
   */
  async getTotalSOM() {
    const sql = `
    SELECT 
      COALESCE(CAST(SUM(users_wallets.balance) AS INTEGER),0) as total_som
    FROM 
      users_wallets
    `;
    return (await getManager().query(sql))[0];
  }
  /**
   * gets the total purchased SOM query
   *
   * @returns total purchased SOM
   */
  async getTotalPurchasedSOM() {
    const sql = `
      SELECT 
        COALESCE(CAST(SUM(wallet_recharges."amountInSom") AS INTEGER),0) as total_purchased_som
      FROM public.wallet_recharges;
    `;
    return (await getManager().query(sql))[0];
  }
  /**
   * gets the total reward SOM query
   *
   * @returns total reward SOM
   */
  async getTotalRewardSOM() {
    const sql = `
    SELECT 
      COALESCE(CAST(SUM(rewards.amount) AS INTEGER),0) as total_rewards_som
    FROM 
      rewards
    `;
    return (await getManager().query(sql))[0];
  }

  /**
   * get SOM graph data query
   *
   * @param queryOptions
   * @returns SOM graph array
   */
  public async getSOMGraphData(queryOptions: SomStatisticsDTO) {
    const sql = `
    SELECT  
      CAST(EXTRACT('year' FROM q1.date) AS INTEGER) AS year,
      CAST(EXTRACT('month' FROM q1.date) AS INTEGER) AS month,
      COALESCE(CAST(q2.rewardedSom AS INTEGER), 0) AS "rewardedSOM",
      COALESCE(CAST(q3.purchasedSom AS INTEGER), 0) AS "purchasedSOM"
    FROM
      (SELECT 
          GENERATE_SERIES(DATE_TRUNC('month', TO_TIMESTAMP(${queryOptions.start_date}::numeric))
          ,DATE_TRUNC('month', TO_TIMESTAMP(${queryOptions.end_date}::numeric))
          ,'1 month'::interval) AS date
      ) AS q1
    LEFT JOIN
      (SELECT
        DATE_TRUNC('month', TO_TIMESTAMP(R."createdAt")) AS date,
        SUM(R."amount") AS rewardedSom
      FROM 
        rewards AS R
      GROUP BY
      DATE_TRUNC('month', TO_TIMESTAMP(R."createdAt"))
      ) AS q2
    ON q1.date = q2.date
    LEFT JOIN
      (SELECT 
        DATE_TRUNC('month', TO_TIMESTAMP(WR."createdAt")) AS date,
        SUM(WR."amountInSom") AS purchasedSom
      FROM wallet_recharges AS WR
      GROUP BY
      DATE_TRUNC('month', TO_TIMESTAMP(WR."createdAt"))
      ) AS q3
    ON q1.date = q3.date
    `;
    return await getManager().query(sql);
  }
}
