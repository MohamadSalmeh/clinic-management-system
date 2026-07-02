import { Type } from "class-transformer";
import { IsDateString, IsInt } from "class-validator";

export class CreateWaitlistDto {
    @Type(() => Number)
    @IsInt()
    doctorId!: number;

    @Type(() => Number)
    @IsInt()
    clinicId!: number;

    @IsDateString()
    requestedDate!: string;
}