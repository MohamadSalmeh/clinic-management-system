import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DoctorInviteRegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;
}
