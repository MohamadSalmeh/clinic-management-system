import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto';
import { AuthHelperProvider } from './providers';
import { AuthResponse, JWTPayloadType, UserRole } from '../utils';
import { Gender } from '../users/enums/gender.enum';
import { PreferredLanguage } from '../users/enums/preferredLanguage.enum';
import { ThemeMode } from '../users/enums/themeMode.enum';
import { GoogleUserData } from './strategies';
import { AuthSessionProvider } from './providers';
import { UserStatus } from '../users/enums/user-status.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authHelperProvider: AuthHelperProvider,
    private readonly authSessionProvider: AuthSessionProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.authHelperProvider.hashPassword(
      registerDto.password,
    );

    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      phone: registerDto.phone,
      firstName: registerDto.firstName,
      fatherName: registerDto.fatherName,
      lastName: registerDto.lastName,
      birthDate: new Date(registerDto.birthDate),
      gender: registerDto.gender,
      address: registerDto.address,
      avatarUrl: registerDto.avatarUrl ?? null,
      preferredLanguage: registerDto.preferredLanguage,
      themeMode: registerDto.themeMode,
      role: this.mapUsertypeToRole(registerDto.usertype),
    });

    const savedUser = await this.userRepository.save(user);

    return this.userRepository.findOneOrFail({
      where: { id: savedUser.id },
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    return this.buildAuthResponse(user);
  }

  async validateGoogleUser(googleData: GoogleUserData): Promise<AuthResponse> {
    const normalizedEmail = googleData.email.trim().toLowerCase();

    let user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const newGoogleUser = this.userRepository.create({
        email: normalizedEmail,
        password: null,
        phone: 'N/A',
        firstName: googleData.firstName || 'Google',
        fatherName: googleData.firstName || 'Google',
        lastName: googleData.lastName || 'User',
        birthDate: new Date('1970-01-01'),
        gender: Gender.MALE,
        address: 'Google Account',
        avatarUrl: googleData.picture,
        preferredLanguage: PreferredLanguage.EN,
        themeMode: ThemeMode.SYSTEM,
        role: UserRole.PATIENT,
        isVerified: true,
      });

      const savedGoogleUser = await this.userRepository.save(newGoogleUser);
      user = await this.userRepository.findOneOrFail({
        where: { id: savedGoogleUser.id },
      });
    }

    return this.buildAuthResponse(user);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();

    const userWithPassword = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();

    if (!userWithPassword || !userWithPassword.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.authHelperProvider.comparePassword(
      password,
      userWithPassword.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.userRepository.findOne({
      where: { id: userWithPassword.id },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async logout(userId: number, accessToken: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.authSessionProvider.revokeToken(accessToken);

    return { message: 'Logged out successfully' };
  }

  async deactivateAccount(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.INACTIVE;
    user.isVerified = false;

    await this.userRepository.save(user);

    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  async deleteAccount(userId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    return { message: 'Account deleted successfully' };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const payload: JWTPayloadType = this.buildJwtPayload(user);
    const accessToken = await this.authHelperProvider.generateJWT(payload);

    const decodedToken = this.jwtService.decode(accessToken) as
      | Partial<JWTPayloadType>
      | null;

    if (!decodedToken?.sub) {
      throw new UnauthorizedException('Failed to generate a valid token');
    }

    return {
      accessToken,
      user: {
        id: Number(user.id),
        email: user.email,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim(),
      },
    };
  }

  private buildJwtPayload(user: User): JWTPayloadType {
    const versionRaw = this.configService.get<string>('JWT_VERSION');
    const version = versionRaw && /^\d+$/.test(versionRaw) ? Number(versionRaw) : 1;

    return {
      sub: Number(user.id),
      email: user.email,
      usertype: user.role.toUpperCase() as JWTPayloadType['usertype'],
      version,
    };
  }

  private mapUsertypeToRole(usertype?: RegisterDto['usertype']): UserRole {
    switch (usertype) {
      case 'ADMIN':
        return UserRole.ADMIN;
      case 'DOCTOR':
        return UserRole.DOCTOR;
      case 'PATIENT':
      default:
        return UserRole.PATIENT;
    }
  }
}
