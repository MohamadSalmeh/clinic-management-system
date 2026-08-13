import { Expose } from 'class-transformer';

export class PatientMedicalProfileResponseDto {
  @Expose() id!: number;
  @Expose() bloodType!: string | null;
  @Expose() pregnancyStatus!: string | null;
  @Expose() disabilityInfo!: string | null;
  @Expose() currentSymptoms!: string | null;
  @Expose() allergies!: any | null;
  @Expose() chronicConditions!: any | null;
  @Expose() pastSurgeries!: any | null;
  @Expose() familyHistory!: any | null;
  @Expose() currentMedications!: any | null;
  @Expose() lifestyleHabits!: any | null;
  @Expose() vaccinationStatus!: any | null;
}