import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminProfile } from './entities/admin-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../utils';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(AdminProfile)
    private readonly adminRepository: Repository<AdminProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAdminProfileByUserId(userId: number): Promise<AdminProfile> {
    const adminProfile = await this.adminRepository.findOne({
      where: { userId },
    });

    if (!adminProfile) {
      const result = await this.createAdminProfile(userId);
      return result.profile;
    }

    return adminProfile;
  }

  async createAdminProfile(
    userId: number,
  ): Promise<{ profile: AdminProfile; created: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('User is not an admin');
    }

    const existingProfile = await this.adminRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      return { profile: existingProfile, created: false };
    }

    const profile = this.adminRepository.create({ userId });

    try {
      const savedProfile = await this.adminRepository.save(profile);
      return { profile: savedProfile, created: true };
    } catch (error) {
      const err = error as { code?: string } | undefined;
      if (err?.code === '23505') {
        const existing = await this.adminRepository.findOneOrFail({
          where: { userId },
        });
        return { profile: existing, created: false };
      }
      throw error;
    }
  }
}
