import {
  IsEnum,
  IsOptional,
  MaxLength,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { FAQStatusEnum } from '../../../faq/commons/faq.enum';

export class FAQListSearch {
  @IsOptional()
  search: string;
}

export class FaqDTO {
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
  @IsEnum(FAQStatusEnum, { message: 'enter a valid status' })
  status: string;
}
