import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RatingStatus } from '../enums/rating-status.enum';

export class AdminRatingQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number = 10;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    doctorId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    patientId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    score?: number;

    @IsOptional()
    @IsEnum(RatingStatus)
    status?: RatingStatus;

    @IsOptional()
    @IsString()
    search?: string;
}