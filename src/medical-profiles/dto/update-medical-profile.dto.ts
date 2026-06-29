import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateMedicalProfileDto } from './create-medical-profile.dto';

export class UpdateMedicalProfileDto extends PartialType(CreateMedicalProfileDto) {
    @IsOptional()
    @IsString()
    changeReason?: string;
}