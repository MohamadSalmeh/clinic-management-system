import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { LookupCategory } from '../enums/lookup-category.enum';

export class CreateLookupDto {
  @IsEnum(LookupCategory)
  category!: LookupCategory;

  @IsString()
  @MaxLength(255)
  value!: string;

  @IsString()
  @MaxLength(255)
  labelEn!: string;

  @IsString()
  @MaxLength(255)
  labelAr!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
