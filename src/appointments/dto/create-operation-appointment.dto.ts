import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
} from 'class-validator';

export class CreateOperationAppointmentDto {
    @Type(() => Number)
    @IsInt()
    patientId!: number;

    @Type(() => Number)
    @IsInt()
    doctorId!: number;

    @Type(() => Number)
    @IsInt()
    clinicId!: number;

    @IsDateString()
    requestedDate!: string;

    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    startTime!: string;

    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    endTime!: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    operationCost!: number;
}