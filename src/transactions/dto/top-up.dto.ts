import {
    IsCreditCard,
    IsNumber,
    IsPositive,
    Length,
} from 'class-validator';

export class TopUpDto {

    @IsCreditCard()
    cardNumber!: string;

    @Length(3, 4)
    cvv!: string;

    @IsNumber()
    @IsPositive()
    amount!: number;

}