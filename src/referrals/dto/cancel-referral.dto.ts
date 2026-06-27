import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelReferralDto {
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @IsString({ message: 'Cancellation reason must be a string' })
  @MinLength(5, {
    message: 'Cancellation reason must be at least 5 characters long',
  })
  cancellationReason!: string;
}
