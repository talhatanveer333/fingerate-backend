import {
  IsEnum,
  IsOptional,
  MaxLength,
  IsString,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { NoticeStatusEnum } from './notice.enum';

export class NoticeListSearch {
  @IsOptional()
  search: string;
}

export class NoticeDTO {
  @IsNotEmpty({ message: 'title is required' })
  @IsString({ message: 'title should be a string' })
  @MaxLength(255)
  title: string;

  @IsNotEmpty({ message: 'content is required' })
  @IsString({ message: 'content should be a string' })
  @MaxLength(600)
  content: string;

  @IsNotEmpty({ message: 'image is required' })
  @IsString({ message: 'image should be a string' })
  image: string;

  @IsNotEmpty({ message: 'status is required' })
  @IsString({ message: 'status should be a string' })
  @IsEnum(NoticeStatusEnum, { message: 'enter a valid status' })
  status: string;

  @IsOptional()
  @IsString({ message: 'url should be a string' })
  @Matches(/^(?:(?:(?:https?|ftp):)\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i, { message: 'url is invalid' })
  url: string;
}
