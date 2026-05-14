import { IsIn, IsOptional } from 'class-validator';

export class PatientAppointmentsQueryDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';
}
