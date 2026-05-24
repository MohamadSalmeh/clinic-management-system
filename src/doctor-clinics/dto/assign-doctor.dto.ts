import { IsInt, Min } from 'class-validator';

export class AssignDoctorDto {
  @IsInt()
  @Min(1)
  clinicId!: number;

  @IsInt()
  @Min(1)
  doctorId!: number;
}
