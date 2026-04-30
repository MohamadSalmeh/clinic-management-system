import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsString, MaxLength } from 'class-validator';
import { PreferredLanguage } from '../enums/preferredLanguage.enum';
import { ThemeMode } from '../enums/themeMode.enum';

class UpdateUserBaseDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  address!: string;

  @IsEnum(PreferredLanguage)
  language!: PreferredLanguage;

  @IsEnum(ThemeMode)
  theme!: ThemeMode;


}

export class UpdateUserDto extends PartialType(UpdateUserBaseDto) {}
