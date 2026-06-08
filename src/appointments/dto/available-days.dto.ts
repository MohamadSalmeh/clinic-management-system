import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class AvailableDaysDto {

    @Type(() => Number)
    @IsInt()
    doctorId!: number;

    @Type(() => Number)
    @IsInt()
    clinicId!: number;

}