import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicalProfileDto } from './create-medical-profile.dto';

export class UpdateMedicalProfileDto extends PartialType(CreateMedicalProfileDto) {}
