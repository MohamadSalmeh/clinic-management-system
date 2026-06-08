import { Type } from 'class-transformer';
import { IsDateString, IsInt } from 'class-validator';

export class WaitListDto {
    @Type(() => Number)
    @IsInt()
    doctorId!: number;

    @Type(() => Number)
    @IsInt()
    clinicId!: number;

    @IsDateString()
    requestedDate!: string;
}