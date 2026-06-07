import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
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

    @IsString()
    @MaxLength(100)
    type!: string;

    @IsIn(['1', '2'])
    priority!: string;

    @IsOptional()
    @IsString()
    reasonForVisit?: string;

    @IsOptional()
    @IsString()
    symptoms?: string;
}
