import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccountDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
