import { ArrayNotEmpty, IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CompletePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  bloodType!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allergies!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  chronicDiseases!: string[];

  @IsDateString()
  birthDate!: string;
}
