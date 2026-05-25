import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MaritalStatus } from '../../users/enums/marital-status.enum';

class UpdatePatientBaseDto {
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

}

export class UpdatePatientDto extends PartialType(UpdatePatientBaseDto) {}
