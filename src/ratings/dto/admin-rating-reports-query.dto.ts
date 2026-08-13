import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    ReportReason,
    ReportStatus,
} from '../enums/report-status.enum';

export class AdminRatingReportsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number = 10;

    @IsOptional()
    @IsEnum(ReportStatus)
    status?: ReportStatus;

    @IsOptional()
    @IsEnum(ReportReason)
    reason?: ReportReason;

    @IsOptional()
    @IsString()
    search?: string;
}