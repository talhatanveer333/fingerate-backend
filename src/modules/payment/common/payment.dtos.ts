import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString
} from 'class-validator';

export class RechargePaymentDto {
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  amountInUsd: number;

  @IsString()
  @IsNotEmpty()
  paymentKey: string;

  @IsNotEmpty()
  orderId: string;

  @IsNotEmpty()
  userId: string;
}

export class TossPaymentFailDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
export class ConversionQueryDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  usd: number;
}
