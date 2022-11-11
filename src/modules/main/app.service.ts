import { Injectable } from '@nestjs/common';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { createDatabase } from 'typeorm-extension';
import { createConnection } from 'typeorm';
import { NodeEnv } from '../../utils/enum';
import { LoggerService } from '../../utils/logger/logger.service';

@Injectable()
export class AppService {
  constructor() { }

  root(): string {
    return process.env.APP_URL;
  }

  /**
   * Initialize postgis
   */
  static async initializePostgis() {
    const conn = await createConnection({
      name: 'temp',
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    try {
      await conn.query('CREATE EXTENSION postgis;');
      await conn.query('CREATE EXTENSION postgis_raster;');
    } catch (err) {
      if (err.message !== 'extension "postgis" already exists') {
        const logger = new LoggerService();
        logger.setContext('AppService');
        logger.error(err);
        process.exit(1);
      }
    }

    await conn.close();
  }

  /**
   * Configures The App Environment
   *
   * @returns
   */
  static envConfiguration(): string {
    switch (process.env.NODE_ENV) {
      case NodeEnv.TEST:
        return `_${NodeEnv.TEST}.env`;

      default:
        return '.env';
    }
  }

  /**
   * Create Connection to Database on App Start
   *
   * @returns
   */
  static async createConnection() {
    await createDatabase(
      { ifNotExist: true },
      {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
    );

    await this.initializePostgis();

    return {
      type: process.env.DB_TYPE,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + './../**/**.entity{.ts,.js}'],
      synchronize: process.env.DB_SYNC === 'true',
      extra: {
        connectionLimit: 5,
      },
      logging: false,
    } as TypeOrmModuleAsyncOptions;
  }
}
