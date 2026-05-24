import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CompletePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  bloodType!: string;

  @IsArray()
  @IsString({ each: true })
  allergies!: string[];

  @IsArray()
  @IsString({ each: true })
  chronicDiseases!: string[];

  @IsDateString()
  birthDate!: string;
}
