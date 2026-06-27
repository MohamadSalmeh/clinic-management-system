import {
    IsBoolean,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateMedicalHistoryDto {

    @IsInt()
    appointmentId: number;

    @IsString()
    diagnosis: string;

    @IsString()
    treatmentPlan: string;

    @IsString()
    doctorNotes: string;

    @IsBoolean()
    followUpNeeded: boolean;

    @IsOptional()
    @IsDateString()
    followUpDate?: string;

}