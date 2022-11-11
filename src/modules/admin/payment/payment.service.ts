import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';
import { PaymentStatisticsDTO } from './commons/payment.dto';
import { IPaymentStatisticsFilters } from './commons/payment.type';
import moment from 'moment';
import { Payment } from '../../payment/payment.entity';
import { PaymentStatus } from './../../../modules/payment/common/payment.enums';
import {
  IPaymentGraphStatsFilters,
  IPaymentGraphStatsReturnObject,
} from './commons/payment.types';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';

@Injectable()
export class AdminPaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>
  ) { }


  /**
   * 
   * @param uuid 
   */
  public async getSurveyPaymentDetails(uuid: string) {
    const sql = `
    SELECT
      U."email",
      U."nickName",
      P."type",
      P."amount",
      null AS admin_email,
      S."question"
    FROM
      users AS U
    INNER JOIN payments AS P ON P."walletId" = U."walletId"
    LEFT JOIN surveys AS S ON S."uuid" = P."surveyId"
    WHERE
      P."uuid" = '${uuid}'
    `;
    const result = await getManager().query(sql);
    return result;
  }
  /**
   * 
   * @param uuid 
   */
  public async getItemPaymentDetails(uuid: string) {
    const sql = `
    SELECT
      U."email",
      U."nickName",
      P."type",
      P."amount",
      null AS admin_email,
	  (SELECT
         ARRAY_AGG(AI."item_name"::varchar) as items
    	FROM 
	    payments AS P
    	LEFT JOIN orders_items AS OI ON P."orderId" = OI."orderId"
    	LEFT JOIN avatars_items AS AI ON OI."itemId" = AI."uuid"
	    WHERE
      		P."uuid" = '${uuid}'
	  )
    FROM
      users AS U
    INNER JOIN payments AS P ON P."walletId" = U."walletId"
    WHERE
      P."uuid" = '${uuid}'
    `;
    const result = await getManager().query(sql);
    return result;
  }

  /**
   * 
   * @param uuid 
   */
  public async getProductAndSurveyDeatilsOfPayment(uuid: string) {
    const payment = await this.paymentRepo.findOne({
      where: {
        uuid
      },
      relations: ['orderId', 'surveyId']
    });
    if (!payment) {
      throw new HttpException({
        statusCode: ResponseCode.PAYMENT_DOES_NOT_EXISTS,
        message: ResponseMessage.PAYMENT_DOES_NOT_EXISTS
      },
        ResponseCode.PAYMENT_DOES_NOT_EXISTS);
    }
    return payment;
  }

  /**
   * Set Dates Payment Format
   *
   * @params queryOptions
   * @returns datesFormat
   */
  public async setPaymentDateFilter(queryOptions: PaymentStatisticsDTO) {
    const datesFormat: IPaymentStatisticsFilters = {
      endDate: queryOptions.end_date
        ? `'${moment
          .unix(+queryOptions.end_date)
          .endOf('month')
          .format('YYYY-MM-DD')}'`
        : `'${moment
          .unix(moment().unix())
          .endOf('month')
          .format('YYYY-MM-DD')}'`,
      startDate: queryOptions.start_date
        ? `'${moment
          .unix(+queryOptions.start_date)
          .startOf('month')
          .format('YYYY-MM-DD')}'`
        : `'${moment
          .unix(moment().unix())
          .subtract(5, 'months')
          .startOf('month')
          .format('YYYY-MM-DD')}'`,
    };
    return datesFormat;
  }

  /**
   * Get Payment Statistics
   *
   * @params IPaymentStatisticsFilters
   * @returns totalCumulativePayments, cumulativePaymentGraphData
   */
  public async getCumulativePaymentStatistics(
    dateFilter: IPaymentStatisticsFilters,
  ) {
    const { total_cumultaive_payment: totalCumultaivePayments } =
      await this.getCumulativePayment();
    const cumulativePaymentGraphData = await this.getCumulativePaymentGraph(
      dateFilter,
    );
    return {
      totalCumultaivePayments,
      cumulativePaymentGraphData,
    };
  }

  /**
   * gets the cumulative payments query
   *
   * @returns cumulative payment
   */
  async getCumulativePayment() {
    const sql = `
    SELECT 
      SUM(payments.amount) as total_cumultaive_payment
    FROM 
      payments
    WHERE 
      payments."paymentStatus" LIKE '${PaymentStatus.COMPLETED}'
    `;
    return (await getManager().query(sql))[0];
  }

  /**
   * gets the cumulative payments graph query
   *
   *  @params filter
   * @returns cumulative payment graph data array
   */
  async getCumulativePaymentGraph(datesFilter: IPaymentStatisticsFilters) {
    const sql = `
    SELECT
        EXTRACT('year' FROM d) AS payment_year,
        CAST(EXTRACT('month' FROM d) AS INTEGER) AS payment_month,
        COALESCE(CAST((SELECT SUM(payments.amount) FROM payments WHERE payments."paymentStatus" LIKE '${PaymentStatus.COMPLETED}' AND to_timestamp(payments."createdAt") < d) AS INTEGER),0) AS total_payment
    FROM
    GENERATE_SERIES(
        ${datesFilter.endDate},
        ${datesFilter.startDate},
        interval '-1 month'
    ) AS d
    `;
    return await getManager().query(sql);
  }

  /**
   * return the graph data
   *
   * @param queryOptions
   * @returns
   */
  public async getPaymentGraph(queryOptions: PaymentStatisticsDTO) {
    const sql = `
    SELECT  
      CAST(EXTRACT('year' FROM q1.date) AS INTEGER) AS payment_year,
      CAST(EXTRACT('month' FROM q1.date) AS INTEGER) AS payment_month,
      COALESCE(q2.amount, 0) AS payment,
      COALESCE(SUM(q2.amount) OVER (ORDER BY q1.date), 0) AS total
    FROM
      (SELECT 
          GENERATE_SERIES(DATE_TRUNC('month', TO_TIMESTAMP(${queryOptions.start_date}::numeric))
          ,DATE_TRUNC('month', TO_TIMESTAMP(${queryOptions.end_date}::numeric))
          ,'1 month'::interval) AS date
      ) AS q1
    LEFT JOIN
      (SELECT
        DATE_TRUNC('month', TO_TIMESTAMP(P."createdAt")) AS date,
        SUM(P."amount") AS amount
      FROM 
        payments AS P
      GROUP BY
      DATE_TRUNC('month', TO_TIMESTAMP(P."createdAt"))
      ) AS q2
    ON q1.date = q2.date
    `;
    const result = await getManager().query(sql);
    const { total } = result[result.length - 1];
    const paymentReturnObject: IPaymentGraphStatsReturnObject = {
      totalOfNewPayments: total,
      graphData: result,
    };
    return paymentReturnObject;
  }
}
