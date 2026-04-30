import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { MaritalStatus } from '../../users/enums/marital-status.enum';

class CreatePatientProfileBaseDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  userId!: number;

  @IsEnum(MaritalStatus)
  maritalStatus!: MaritalStatus;

  @IsString()
  @IsNotEmpty()
  occupation!: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactName!: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactPhone!: string;

}

export class CreatePatientProfileDto extends CreatePatientProfileBaseDto {}
