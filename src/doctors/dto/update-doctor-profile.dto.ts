import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Gender } from '../../users/enums/gender.enum';

class UpdateDoctorProfileBaseDto {
  @IsEnum(Gender)
  gender!: Gender;

  @IsDateString()
  birthDate!: string;

  @IsString()
  specialization!: string;

  @IsString()
  subSpecialization!: string;

  @IsString()
  licenseNumber!: string;

  @IsInt()
  @Min(0)
  experienceYears!: number;

  @IsString()
  bio!: string;

  @IsOptional()
  @IsNumberString()
  initialVisitFee?: string;

  @IsOptional()
  @IsNumberString()
  returnVisitFee?: string;

  @IsArray()
  @IsString({ each: true })
  languagesSpoken!: string[];
}

export class UpdateDoctorProfileDto extends PartialType(
  UpdateDoctorProfileBaseDto,
) {}
