import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  LoggerMessages,
  ResponseCode,
  ResponseMessage,
} from '../../utils/enum';
import { Response } from 'express';
import { LoggerService } from '../../utils/logger/logger.service';
import { MediaService } from './media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../../utils/s3/s3.service';
import { S3KeyDto } from './commons/media.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('api/media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('MediaController');
  }

  @Post('/upload_image')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: S3Service.fileFilter,
      limits: { fileSize: 50000000 },
    }),
  )
  public async uploadImage(
    @UploadedFile() image: Express.Multer.File,
    @Res() res: Response,
  ): Promise<Response> {
    this.loggerService.log(
      `POST media/upload_image ${LoggerMessages.API_CALLED}`,
    );
    if (!image || image.mimetype.split('/')[0] !== 'image') {
      throw new HttpException(
        {
          statusCode: ResponseCode.BAD_REQUEST,
          message: ResponseMessage.IMAGE_REQUIRED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const data = await this.mediaService.uploadImage(image);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      data,
      message: ResponseMessage.SUCCESS,
    });
  }

  @Delete('/delete_image')
  public async deleteImage(@Body() body: S3KeyDto, @Res() res: Response) {
    this.loggerService.log(
      `DELETE media/delete_image ${LoggerMessages.API_CALLED}`,
    );
    await this.mediaService.deleteImage(body.key);
    return res.status(ResponseCode.SUCCESS).send({
      statusCode: ResponseCode.SUCCESS,
      message: ResponseMessage.SUCCESS,
    });
  }
}
