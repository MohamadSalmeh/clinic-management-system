import {
    IsDateString,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreatePrescribedMedicineDto {

    @IsString()
    medicineName!: string;

    @IsOptional()
    @IsString()
    dosage?: string;

    @IsOptional()
    @IsString()
    frequency?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}