import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { DoctorScheduleSlotDto } from './doctor-schedule-slot.dto';

export class CreateDoctorScheduleDto {
  @IsNotEmpty()
  @IsInt()
  clinicId!: number;

  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorScheduleSlotDto)
  slots?: DoctorScheduleSlotDto[];
}
