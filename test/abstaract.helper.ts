import { INestApplication } from '@nestjs/common';
import { getConnection } from 'typeorm';
import { Media } from '../src/modules/media/media.entity';

export abstract class Helper {
  protected app: INestApplication;
  protected token: string;

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Get Jwt Token of User
   * @returns JwtToken
   */
  public getAccessToken() {
    return `Bearer ${this.token}`;
  }

  /**
   * Create media for test
   * @param key
   */
  public async createMedia(key: string) {
    let media = new Media();
    media.key = key;
    let mediaRepository = getConnection().getRepository(Media);
    return await mediaRepository.save(media);
  }

  /**
   * clear `test` database
   */
  public async clearDB() {
    const entities = getConnection().entityMetadatas;
    for (const entity of entities) {
      const repository = getConnection().getRepository(entity.name);
      await repository.query(
        `TRUNCATE ${entity.tableName} RESTART IDENTITY CASCADE;`,
      );
    }
  }
}
