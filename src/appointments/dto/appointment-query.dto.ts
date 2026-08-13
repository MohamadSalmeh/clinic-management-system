import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';

export class AppointmentQueryDto {
    @IsOptional()
    @IsIn(['confirmed', 'completed', 'cancelled', 'no_show'])
    status?: 'confirmed' | 'completed' | 'cancelled' | 'no_show';

    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    grouped?: boolean;
}

export class DoctorAppointmentQueryDto {
    @IsOptional()
    @IsIn(['confirmed', 'completed', 'cancelled', 'no_show'])
    status?: 'confirmed' | 'completed' | 'cancelled' | 'no_show';

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}

export class AdminAppointmentQueryDto {
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
    clinicId?: number;

    @IsOptional()
    @IsIn([
        'pending',
        'confirmed',
        'in_progress',
        'cancelled',
        'completed',
        'no_show',
    ])
    status?:
        | 'pending'
        | 'confirmed'
        | 'in_progress'
        | 'cancelled'
        | 'completed'
        | 'no_show';

    @IsOptional()
    @IsIn([
        'pending',
        'held',
        'completed',
        'refunded',
        'partial_refunded',
        'forfeited',
        'failed',
    ])
    paymentStatus?:
        | 'pending'
        | 'held'
        | 'completed'
        | 'refunded'
        | 'partial_refunded'
        | 'forfeited'
        | 'failed';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number;

    @IsOptional()
    search?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}