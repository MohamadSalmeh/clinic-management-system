import { IsEmail } from 'class-validator';

export class CreateDoctorInvitationDto {
  @IsEmail()
  email!: string;
}
