import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsNumberString,
  Validate,
  Matches,
} from 'class-validator';
import { AvatarBannerStatusEnum } from '../../../avatarbanner/commons/avatarbanner.enum';
import { ResponseMessage } from '../../../../utils/enum';
import { EpochValidator } from '../../../common/validator/epoch.validator';

export class AvatarBannerListSearch {
  @IsOptional()
  start_date: number;

  @IsNumberString()
  @Validate(EpochValidator, {
    message: `${ResponseMessage.INVALID_PARAMETER} end_date `,
  })
  @IsOptional()
  end_date: number;
}

export class AvatarBannerDTO {
  @IsNotEmpty()
  @IsString()
  image: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(?:(?:(?:https?|ftp):)\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i, { message: 'url is invalid' })
  pushLink: string

  @IsNotEmpty()
  @IsString()
  @IsEnum(AvatarBannerStatusEnum, { message: ResponseMessage.INVALID_AVATAR_BANNER_STATUS })
  status: string;
}