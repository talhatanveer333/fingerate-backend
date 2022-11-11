import { IsNotEmpty, IsString } from 'class-validator';

export class S3KeyDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}
