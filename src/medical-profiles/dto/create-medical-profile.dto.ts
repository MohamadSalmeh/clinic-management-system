import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PregnancyStatus } from '../enums/pregnancy-status.enum';

export class CreateMedicalProfileDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsEnum(PregnancyStatus)
  pregnancyStatus?: PregnancyStatus;

  @IsOptional()
  @IsString()
  disabilityInfo?: string;

  @IsOptional()
  @IsString()
  currentSymptoms?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pastSurgeries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lifestyleHabits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vaccinationStatus?: string[];
}
