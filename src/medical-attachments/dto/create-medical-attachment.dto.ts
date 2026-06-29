import { IsOptional, IsString } from 'class-validator';

export class CreateMedicalAttachmentDto {

    @IsOptional()
    @IsString()
    description?: string;
}