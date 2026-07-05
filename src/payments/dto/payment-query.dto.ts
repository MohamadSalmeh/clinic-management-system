import { IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

export class MyPaymentQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}