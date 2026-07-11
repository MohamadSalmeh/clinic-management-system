import { IsDateString, IsOptional } from 'class-validator';

export class DoctorOperationQueryDto {
    @IsOptional()
    @IsDateString()
    date?: string;
}