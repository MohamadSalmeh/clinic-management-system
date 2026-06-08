import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clinicId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctorId?: number;
}