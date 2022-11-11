import { IsNotEmpty, IsUUID } from 'class-validator';

export class UUIDDto {
  @IsNotEmpty()
  @IsUUID(undefined, { message: 'invalid uuid' })
  uuid: string;
}
