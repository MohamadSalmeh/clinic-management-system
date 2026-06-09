import { IsInt, Max, Min } from 'class-validator';

export class UpdateSystemSettingDto {

    @IsInt()
    @Min(0)
    cancelBeforeDays!: number;

    @IsInt()
    @Min(0)
    @Max(100)
    lateCancelPenaltyPercent!: number;

    @IsInt()
    @Min(1)
    maxNoShowCount!: number;

    @IsInt()
    @Min(5)
    initialVisitDuration!: number;

    @IsInt()
    @Min(5)
    returnVisitDuration!: number;
}