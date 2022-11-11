import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsString,
  IsUUID,
} from 'class-validator';
import { MapSotListFilter, SotListFilter } from './sot.enums';

export class SotListQueryDto {
  @IsString()
  search: string;

  @IsEnum(SotListFilter)
  filter: string;

  @IsNumberString()
  longitude: number;

  @IsNumberString()
  latitude: number;
}

export class MapSotListQueryDto {
  @IsEnum(MapSotListFilter)
  filter: string;
}

export class SotIdParamDto {
  @IsUUID()
  sotId: string;
}
