import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EmailOrPhoneXor } from './identifier-xor.validator';

export class ForgotPasswordDto {
  @EmailOrPhoneXor()
  identifier?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @IsOptional()
  phone?: string;
}
