import { IsEnum } from 'class-validator';
import { MedicineStatus } from '../enums/medicine-status.enum';

export class UpdateMedicineStatusDto {

    @IsEnum(MedicineStatus)
    status!: MedicineStatus;

}