import { HttpException, Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import * as path from 'path';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
@Injectable()
export class S3Service {
  constructor() {}

  /**
   * @param req
   * @param file
   * @param callback
   */
  static fileFilter(req, file: Express.Multer.File, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.split('/')[0] === 'image') {
      if (!ext.match(/\.(jpg|png)$/)) {
        callback(
          new HttpException(
            ResponseMessage.IMAGES_ALLOW,
            ResponseCode.IMAGES_ALLOW,
          ),
          false,
        );
      }
      callback(null, true);
    } else {
      callback(
        new HttpException(
          ResponseMessage.INVALID_FILE_FORMAT,
          ResponseCode.BAD_REQUEST,
        ),
        false,
      );
    }
  }

  /**
   * @returns
   */
  getS3() {
    return new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      signatureVersion: 's3v4',
      region: process.env.AWS_REGION,
    });
  }

  /**
   * @param file
   * @returns
   */
  async upload(file: Express.Multer.File) {
    const { originalname } = file;
    const bucketS3 = process.env.AWS_BUCKET_NAME;
    const mediaName = String(
      new Date().toISOString() + '_' + originalname.replace(/\s/g, ''),
    );
    return this.uploadS3(file.buffer, bucketS3, mediaName, file.mimetype);
  }

  /**
   * @param file
   * @param bucket
   * @param name
   * @param mimetype
   * @returns
   */
  async uploadS3(file: any, bucket: string, name, mimetype) {
    try {
      const s3 = this.getS3();
      const params = {
        acl: 'public-read',
        Bucket: bucket,
        Key: name,
        ContentType: mimetype,
        Body: file,
      };
      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            reject(err.message);
          }
          resolve(data);
        });
      });
    } catch (err) {
      throw err;
    }
  }

  getPublicURL(key: string) {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  /**
   * @param Key
   * @returns
   */
  getSignedURL(key) {
    try {
      const s3 = this.getS3();
      return s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Expires: 100000,
      });
    } catch (error) {
      throw error;
    }
  }

  public async getKeys() {
    try {
      const s3 = this.getS3();
      const keysArray = [];
      const lists = await s3
        .listObjects({ Bucket: process.env.AWS_BUCKET_NAME })
        .promise();
      lists.Contents.forEach((obj) => keysArray.push(obj.Key));
      return keysArray;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @param Key
   * @returns
   */
  async deleteObject(key: string) {
    try {
      const s3 = this.getS3();
      const Bucket = process.env.AWS_BUCKET_NAME;
      await s3
        .deleteObject({
          Bucket,
          Key: key,
        })
        .promise();
      return;
    } catch (error) {
      throw error;
    }
  }
}
