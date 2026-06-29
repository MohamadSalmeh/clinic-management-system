import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { ActiveUserData, UserRole } from '../utils';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto';
import { UserAccessProvider } from './providers';
import { AuthService } from '../auth';
import { FileStorageService } from '../file-storage/file-storage.service';
import * as path from 'path';
import { Response } from 'express';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    private readonly userAccessProvider: UserAccessProvider,
    private readonly fileStorageService: FileStorageService,
  ) { }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
  /**
   * 
   * @param id 
   * @todo 
   * @returns get user by id, including their patientProfile if they are a patient, and doctorProfile if they are a doctor. If the user is a patient but has no patientProfile, it will not throw an error but simply return the user without the profile.
   */
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        patientProfile: true,
        doctorProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.PATIENT) {
      await this.ensurePatientProfileManaged(user);
    }

    return user;
  }
  /**
   * 
   * @param id 
   * @param updateDto 
   * @param currentUser 
   * @returns  update user data, but only if the currentUser has permission to update the target user (id) based on their role and relationship.
   */
  async update(
    id: number,
    updateDto: UpdateUserDto,
    currentUser: ActiveUserData,
  ): Promise<User> {
    this.userAccessProvider.assertCanUpdateTarget(currentUser, id);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.firstName !== undefined) {
      user.firstName = updateDto.firstName;
    }

    if (updateDto.lastName !== undefined) {
      user.lastName = updateDto.lastName;
    }

    if (updateDto.address !== undefined) {
      user.address = updateDto.address;
    }

    if (updateDto.language !== undefined) {
      user.preferredLanguage = updateDto.language;
    }

    if (updateDto.theme !== undefined) {
      user.themeMode = updateDto.theme;
    }

    await this.userRepository.save(user);

    return this.findOne(id);
  }
  /**
   * 
   * @param user 
   * @returns check if the user is a patient and has a patientProfile, if not try to find one by userId, if still not found, just return without throwing an error since it's possible to have a patient user without a profile yet. This method ensures that we don't throw unnecessary errors for patients who haven't completed their profile setup, while still allowing us to access the profile data when it exists.
   */
  private async ensurePatientProfileManaged(user: User): Promise<void> {
    if (user.patientProfile) {
      return;
    }

    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId: user.id },
    });

    if (patientProfile) {
      user.patientProfile = patientProfile;
      return;
    }

    // بدلاً من رمي خطأ NotFoundException، سنتركها تعود بسلام 
    // أو يمكنك إنشاء بروفايل فارغ إذا أردت ذلك تقنياً:
    // console.warn(`Notice: User ${user.id} is a PATIENT but has no PatientProfile yet.`);
  }
  async updateAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarUrl) {
      await this.fileStorageService.deleteFile(user.avatarUrl);
    }

    const avatarPath = await this.fileStorageService.saveFile(
      file,
      'avatars',
    );

    user.avatarUrl = avatarPath;

    await this.userRepository.save(user);

    return this.findOne(user.id);
  }
  async removeAvatar(
    userId: number,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatarUrl) {
      throw new NotFoundException('Profile image not found');
    }
    if (this.fileStorageService.fileExists(user.avatarUrl)) {
      await this.fileStorageService.deleteFile(user.avatarUrl);
    }
    await this.fileStorageService.deleteFile(user.avatarUrl);

    user.avatarUrl = null;

    await this.userRepository.save(user);

    return {
      message: 'Profile image removed successfully.',
    };
  }
  async getMyAvatar(
    userId: number,
    response: Response,
  ): Promise<void> {

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatarUrl) {
      throw new NotFoundException('Profile image not found');
    }
    response.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return response.sendFile(path.resolve(user.avatarUrl));
  }

}
