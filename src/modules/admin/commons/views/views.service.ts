import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';
import { LoggerService } from '../../../../utils/logger/logger.service';

@Injectable()
export class ViewsService {

  /**
   * initialize the view
   */
  public async createPaymentRewardRechargeView() {
    try {
      await getManager().query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS PAYMENT_REWARD_VIEW AS
      SELECT P."uuid",
        P."walletId",
        P."createdAt" AS TRX_DATE,
        P."type",
        P."amount" AS AMOUNT,
        'payment' AS TABLE_NAME
      FROM PAYMENTS AS P
      WHERE
        P."type" != 'reward'
      UNION ALL
      SELECT R."uuid",
        R."walletId",
        R."createdAt",
        R."type",
        R."amount",
        'reward' AS TABLE_NAME
      FROM REWARDS AS R;

      CREATE UNIQUE INDEX IF NOT EXISTS PAYMENT_REWARD_INDEX ON PAYMENT_REWARD_VIEW (UUID);

      CREATE OR REPLACE FUNCTION REFRESH_VIEW() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
            BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY PAYMENT_REWARD_VIEW;
            RETURN NULL;
            END;
            $$;


      CREATE OR REPLACE TRIGGER REFRESH_PAYMENT_VIEW AFTER
      INSERT
      OR
      DELETE
      OR
      UPDATE
      OR TRUNCATE ON PAYMENTS
      FOR EACH STATEMENT EXECUTE PROCEDURE REFRESH_VIEW();


      CREATE OR REPLACE TRIGGER REFRESH_REWARD_VIEW AFTER
      INSERT
      OR
      DELETE
      OR
      UPDATE
      OR TRUNCATE ON REWARDS
      FOR EACH STATEMENT EXECUTE PROCEDURE REFRESH_VIEW();
      `);
    } catch (err) {
      if (err) {
        const logger = new LoggerService();
        logger.setContext('AppService');
        logger.error(err);
        process.exit(1);
      }
    }
  }
}