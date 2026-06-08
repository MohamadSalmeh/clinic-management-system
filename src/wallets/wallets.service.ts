import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Wallet } from './entities/wallet.entity';

@Injectable()
export class WalletsService {

    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
    ) { }

    async getMyWallet(
        userId: number,
    ): Promise<Wallet> {

        const wallet =
            await this.walletRepository.findOne({
                where: {
                    userId,
                },
            });

        if (!wallet) {
            throw new NotFoundException(
                'Wallet not found',
            );
        }

        return wallet;
    }

}