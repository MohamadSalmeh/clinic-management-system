import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Gender } from '../../users/enums/gender.enum';
import { PreferredLanguage } from '../../users/enums/preferredLanguage.enum';
import { ThemeMode } from '../../users/enums/themeMode.enum';
import { EmailOrPhoneXor } from './identifier-xor.validator';

export class RegisterDto {
  @EmailOrPhoneXor()
  identifier?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  fatherName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsDateString()
  birthDate!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(PreferredLanguage)
  preferredLanguage?: PreferredLanguage;

  @IsOptional()
  @IsEnum(ThemeMode)
  themeMode?: ThemeMode;
}
