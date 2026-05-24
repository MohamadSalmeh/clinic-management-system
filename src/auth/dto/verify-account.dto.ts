import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EmailOrPhoneXor } from './identifier-xor.validator';

export class VerifyAccountDto {
  @EmailOrPhoneXor()
  identifier?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
