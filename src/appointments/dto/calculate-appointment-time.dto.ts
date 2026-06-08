import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt } from 'class-validator';

export class CalculateAppointmentTimeDto {
    @Type(() => Number)
    @IsInt()
    doctorId!: number;

    @Type(() => Number)
    @IsInt()
    clinicId!: number;

    @Type(() => Number)
    @IsInt()
    scheduleId!: number;

    @IsDateString()
    requestedDate!: string;

    @IsIn(['Initial Visit', 'Return Visit'])
    type!: string;
}