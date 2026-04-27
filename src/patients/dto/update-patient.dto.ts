import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { MaritalStatus } from '../../users/enums/marital-status.enum';

class UpdatePatientBaseDto {
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

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ADMIN', 'DOCTOR', 'PATIENT'])
  usertype!: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

export class UpdatePatientDto extends PartialType(UpdatePatientBaseDto) {}
