import { IsEnum, IsOptional } from 'class-validator';
import { LookupCategory } from '../enums/lookup-category.enum';

export class AdminLookupQueryDto {
  @IsOptional()
  @IsEnum(LookupCategory)
  category?: LookupCategory;
}