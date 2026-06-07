import { IsInt, Min } from 'class-validator';

export class ReorderQueueDto {
  @IsInt()
  @Min(1)
  newPosition!: number;
}