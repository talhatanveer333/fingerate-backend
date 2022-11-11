import { Inject, Injectable, CACHE_MANAGER } from '@nestjs/common';
import { Cache, CachingConfig } from 'cache-manager';
import { EXPIRES, PREFIXES } from './commons/cache-manager.enums';
import { generateOTP } from '../../utils/helper';
import { UserNotification } from '../user/notification.entity';

@Injectable()
export class CacheManagerService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  /**
   * get key in cache manager  
   *
   * @param key
   * @return key | undefined 
   */
  async get(key: string): Promise<string | undefined> {
    return await this.cacheManager.get(key);
  }

  /**
   * delete email variable in cache manager  
   *
   * @param email
   * @return  
   */
  async del(key: string): Promise<any> {
    await this.cacheManager.del(key);
  }

  /**
   * set email variable in cache manager  
   *
   * @param  key: string,
   * @param value: string,
   * @param options?: CachingConfig,
   * @return  
   */
  async set(
    key: string,
    value: string,
    options?: CachingConfig,
  ): Promise<string> {
    return await this.cacheManager.set(key, value, options);
  }

  /**
   * check If User Blocked in email variable in cache manager  
   *
   * @param  email: string,
   * @return  
   */
  async checkIfUserBlocked(email: string): Promise<number> {
    return (await this.get(`${PREFIXES.BLOCK}${email}`))?.length;
  }

  /**
   * delete Failed Login Attempts email variable in cache manager  
   *
   * @param  email: string,
   * @return  
   */
  async deleteFailedLoginAttempts(email: string) {
    await this.del(`${PREFIXES.LOGIN_ATTEMPT}${email}`);
  }

  /**
   * delete Email OTP Attempts email variable in cache manager  
   *
   * @param  email: string,
   * @return  
   */
  async deleteEmailOTPAttempts(email: string) {
    await this.deleteFailedBlockCount(email);
    await this.deleteFailedEmailOTPAttempts(email);
  }

  /**
   * delete Failed Email OTP Attempts email variable in cache manager  
   *
   * @param  email: string,
   * @return  
   */
  async deleteFailedEmailOTPAttempts(email: string) {
    await this.del(`${PREFIXES.OTP_ATTEMPT}${email}`);
  }

  /**
   * delete Failed Block Count email variable in cache manager  
   *
   * @param  email: string,
   * @return  
   */
  async deleteFailedBlockCount(email: string) {
    await this.del(`${PREFIXES.BLOCK}${email}`);
    await this.del(`${PREFIXES.BLOCK_COUNT}${email}`);
    await this.deleteOTP(email);
  }

  /**
   * set OTP email variable in cache  
   *
   * @param email
   * @param ttl = EXPIRES.OTP
   * @return otp 
   */
  async setOTP(email: string, ttl = EXPIRES.OTP): Promise<string> {
    const otp = generateOTP();
    await this.set(`${PREFIXES.OTP}${email}`, otp.toString(), { ttl });
    return otp.toString();
  }

  /**
   * get email in cache  
   *
   * @param email
   * @return email 
   */
  async getOTP(email: string): Promise<string> {
    return await this.get(`${PREFIXES.OTP}${email}`);
  }

  /**
   * delete OTP email in cache 
   *
   * @param email
   * @return void
   */
  async deleteOTP(email: string) {
    await this.del(`${PREFIXES.OTP}${email}`);
  }

  async updateEmailOTPAttempts(email: string): Promise<number> {
    if (await this.checkIfUserBlocked(email)) return;

    let count = 0;
    let blockCount = 0;
    const current = await this.get(`${PREFIXES.OTP_ATTEMPT}${email}`);
    const blockCountCurrent = await this.get(`${PREFIXES.BLOCK_COUNT}${email}`);
    if (current?.length) count = parseInt(current, 10);
    if (blockCountCurrent?.length) blockCount = parseInt(blockCountCurrent, 10);
    count = count + 1;
    await this.set(`${PREFIXES.OTP_ATTEMPT}${email}`, count.toString(), {
      ttl: EXPIRES.OTP_ATTEMPT,
    });

    if (count >= 5) {
      blockCount = blockCount + 1;
      await this.set(`${PREFIXES.BLOCK}${email}`, 'true', {
        ttl: EXPIRES.BLOCK_SIGNUP,
      });
      await this.set(`${PREFIXES.BLOCK_COUNT}${email}`, blockCount.toString(), {
        ttl: EXPIRES.BLOCK_COUNT,
      });
      await this.deleteFailedEmailOTPAttempts(email);
    }

    return blockCount;
  }

  async updateFailedLoginAttempts(email: string) {
    if (await this.checkIfUserBlocked(email)) return;

    let count = 0;
    const current = await this.get(`${PREFIXES.LOGIN_ATTEMPT}${email}`);
    if (current?.length) count = parseInt(current, 10);
    count = count + 1;
    await this.set(`${PREFIXES.LOGIN_ATTEMPT}${email}`, count.toString(), {
      ttl: EXPIRES.LOGIN_ATTEMPT,
    });
    if (count >= 5) {
      await this.set(`${PREFIXES.BLOCK}${email}`, 'true', {
        ttl: EXPIRES.BLOCK_LOGIN,
      });
      await this.deleteFailedLoginAttempts(email);
    }
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Admin Auth
  /*
  /********************************************************************************************************************/

  /**
   * set token against an email in redis
   *
   * @returns
   * @param email
   * @param token
   * @param prefix
   */
  async setToken(email: string, token: string, prefix: PREFIXES) {
    const enumKey = Object.keys(PREFIXES).find(
      (key) => PREFIXES[key] === prefix,
    );
    const ttl = EXPIRES[enumKey];
    await this.set(`${prefix}${email}`, token, { ttl });
  }

  /**
   * get token against an email from redis
   *
   * @returns
   * @param email
   * @param prefix
   */
  async getToken(email: string, prefix: PREFIXES): Promise<string> {
    return await this.get(`${prefix}${email}`);
  }

  /**
   * delete token against an email from redis
   *
   * @returns
   * @param email
   * @param prefix
   */
  async delToken(email: string, prefix: PREFIXES) {
    await this.del(`${prefix}${email}`);
  }

  /** ******************************************************************************************************************/
  /*
  /*                                   Notifications
  /*
  /********************************************************************************************************************/

  /**
   * unread User Notification Count
   *
   * @returns
   * @param uuid
   */
  async getUnreadUserNotificationCount(uuid: string) {
    const current = await this.get(`${PREFIXES.NOTIFICATION_COUNT}${uuid}`);
    let count = 0;
    if (current?.length) count = parseInt(current, 10);
    return count;
  }

  /**
   * set User Unread Notification Count
   *
   * @param userNotification
   * @returns
   */
  async setUserUnreadNotificationCount(userNotification: UserNotification) {
    const userUnreadNotificationCount = await this.get(
      `${PREFIXES.NOTIFICATION_COUNT}${userNotification?.user?.uuid}`,
    );
    let count = 1;
    if (userUnreadNotificationCount?.length) {
      count = parseInt(userUnreadNotificationCount, 10) + 1;
    }

    await this.set(
      `${PREFIXES.NOTIFICATION_COUNT}${userNotification.user.uuid}`,
      count.toString(),
      { ttl: 0 },
    );
  }

  /**
   * set User Notification Count To Zero
   *
   * @returns
   * @param userId
   */
  async deleteUserUnreadNotificationCount(user: string) {
    const userUnreadNotificationCount = await this.get(
      `${PREFIXES.NOTIFICATION_COUNT}${user}`,
    );
    const count = 0;
    if (userUnreadNotificationCount) {
      await this.del(`${PREFIXES.NOTIFICATION_COUNT}${user}`);
    }
    return count;
  }
}
