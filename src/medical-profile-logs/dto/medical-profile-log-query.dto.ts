import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../utils';

export class MedicalProfileLogQueryDto {
    @IsOptional()
    @IsString()
    field?: string;

    @IsOptional()
    @IsEnum(UserRole)
    changedBy?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
