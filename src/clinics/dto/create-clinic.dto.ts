import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ClinicStatus } from '../enums/clinic-status.enum';

export class CreateClinicDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  location!: string;

  @IsEnum(ClinicStatus)
  status!: ClinicStatus;
}
