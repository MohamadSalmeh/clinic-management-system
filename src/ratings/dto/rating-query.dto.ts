import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RatingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;
}