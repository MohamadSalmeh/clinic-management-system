import { IsDateString } from 'class-validator';

export class DayOfWeekDto {
    @IsDateString()
    date!: string;
}