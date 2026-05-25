import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { LookupCategory } from '../enums/lookup-category.enum';

export class LookupQueryDto {
  @IsOptional()
  @IsEnum(LookupCategory)
  category?: LookupCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
