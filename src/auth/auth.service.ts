import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { DoctorInviteRegisterDto, LoginDto, RegisterDto } from './dto';
import { AuthHelperProvider } from './providers';
import { AuthResponse, JWTPayloadType, UserRole } from '../utils';
import { PreferredLanguage } from '../users/enums/preferredLanguage.enum';
import { ThemeMode } from '../users/enums/themeMode.enum';
import { GoogleUserData } from './strategies';
import { DoctorInvitationsService } from '../doctor-invitations/doctor-invitations.service';
import { DoctorInvitation } from '../doctor-invitations/entities/doctor-invitation.entity';
import { DoctorInvitationStatus } from '../doctor-invitations/enums/doctor-invitation-status.enum';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { AdminsService } from '../admins/admins.service';
import { UserStatus } from '../users/enums/user-status.enum';
import { PatientsService } from '../patients/patients.service';
import { OtpService } from './services/otp.service';

type RefreshTokenPayload = Pick<JWTPayloadType, 'sub' | 'version'>;
type AccountStatus = {
  isVerified: boolean;
  isProfileCompleted: boolean;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly adminsService: AdminsService,
    private readonly doctorInvitationsService: DoctorInvitationsService,
    private readonly dataSource: DataSource,
    private readonly authHelperProvider: AuthHelperProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
    private readonly otpService: OtpService,
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

    const { code, expiresAt } = await this.generateVerificationCode();

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
      role: UserRole.PATIENT,
      isVerified: false,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
    });

    const savedUser = await this.userRepository.save(user);

    await this.otpService.sendOtpEmail(savedUser.email, code);

    if (savedUser.role === UserRole.ADMIN) {
      await this.adminsService.createAdminProfile(savedUser.id);
    }

    return this.userRepository.findOneOrFail({
      where: { id: savedUser.id },
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    return this.buildAuthResponse(user);
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const secret = this.getJwtSecret();

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.sub || typeof payload.version !== 'number') {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const user = await this.userRepository.findOne({
      where: { id: Number(payload.sub) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (payload.version !== user.tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const accessPayload = this.buildJwtPayload(user);
    const accessToken = await this.generateAccessToken(accessPayload);

    return { accessToken };
  }

  async logout(userId: number): Promise<{ message: string }> {
    const result = await this.userRepository.increment(
      { id: userId },
      'tokenVersion',
      1,
    );

    if (!result.affected) {
      throw new NotFoundException('User not found');
    }

    return { message: 'Logged out successfully' };
  }

  async verifyAccount(userId: number, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const expiresAt = new Date(user.verificationCodeExpiresAt);

    if (user.verificationCode !== code || expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Account verified successfully' };
  }

  async resendVerification(userId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { code, expiresAt } = await this.generateVerificationCode();

    user.verificationCode = code;
    user.verificationCodeExpiresAt = expiresAt;

    await this.userRepository.save(user);

    await this.otpService.sendOtpEmail(user.email, code);

    return { message: 'Verification code sent' };
  }

  async getAccountStatus(userId: number): Promise<AccountStatus> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isProfileCompleted = this.isProfileCompleted(user);

    if (user.role === UserRole.PATIENT) {
      try {
        const completion = await this.patientsService.getProfileCompletion(userId);
        isProfileCompleted = completion.isComplete;
      } catch (error) {
        if (error instanceof NotFoundException) {
          isProfileCompleted = false;
        } else {
          throw error;
        }
      }
    }

    return {
      isVerified: user.isVerified,
      isProfileCompleted,
      role: user.role,
    };
  }

  async validateGoogleUser(
    googleData: GoogleUserData,
    inviteToken?: string,
  ): Promise<AuthResponse> {
    const normalizedEmail = googleData.email.trim().toLowerCase();
    const normalizedInviteToken = inviteToken?.trim();

    if (normalizedInviteToken) {
      return this.registerDoctorFromGoogleInvite(
        normalizedInviteToken,
        googleData,
      );
    }
    const googleProvider = 'google';

    let user = await this.userRepository.findOne({
      where: {
        provider: googleProvider,
        providerId: googleData.googleId,
      },
    });

    if (!user) {
      const existingUserWithEmail = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUserWithEmail) {
        if (existingUserWithEmail.provider !== googleProvider) {
          throw new ConflictException(
            'Email is already registered with another sign-in method. Please use the original login method ',
          );
        }

        if (
          existingUserWithEmail.providerId &&
          existingUserWithEmail.providerId !== googleData.googleId
        ) {
          throw new UnauthorizedException('Google account does not match this user');
        }

        existingUserWithEmail.providerId = googleData.googleId;
        existingUserWithEmail.avatarUrl =
          existingUserWithEmail.avatarUrl ?? googleData.picture;
        existingUserWithEmail.isVerified = true;

        user = await this.userRepository.save(existingUserWithEmail);
      } else {
        const newGoogleUser = this.userRepository.create({
          email: normalizedEmail,
          provider: googleProvider,
          providerId: googleData.googleId,
          password: null,
          phone: null,
          firstName: googleData.firstName || 'Google',
          fatherName: null,
          lastName: googleData.lastName || 'User',
          birthDate: null,
          gender: null,
          address: null,
          avatarUrl: googleData.picture,
          preferredLanguage: PreferredLanguage.EN,
          themeMode: ThemeMode.SYSTEM,
          role: UserRole.PATIENT,
          isVerified: true,
        });

        user = await this.userRepository.save(newGoogleUser);
      }
    }

    return this.buildAuthResponse(user);
  }

  async validateDoctorInviteToken(
    token: string,
  ): Promise<{ valid: true; email: string }> {
    const invitation = await this.doctorInvitationsService.getValidInvitationByToken(
      token,
    );

    return { valid: true, email: invitation.email };
  }

  async registerDoctorFromInvite(
    token: string,
    dto: DoctorInviteRegisterDto,
  ): Promise<AuthResponse> {
    const invitation = await this.doctorInvitationsService.getValidInvitationByToken(
      token,
    );
    const normalizedEmail = invitation.email.trim().toLowerCase();
    const hashedPassword = await this.authHelperProvider.hashPassword(dto.password);

    const user = await this.createDoctorUserFromInvitation(invitation, {
      email: normalizedEmail,
      password: hashedPassword,
      provider: 'local',
      providerId: null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: null,
    });

    return this.buildAuthResponse(user);
  }

  async rejectDoctorInviteToken(token: string): Promise<{ message: string }> {
    await this.doctorInvitationsService.rejectInvitationByToken(token);
    return { message: 'Invitation rejected' };
  }

  private async registerDoctorFromGoogleInvite(
    token: string,
    googleData: GoogleUserData,
  ): Promise<AuthResponse> {
    const invitation = await this.doctorInvitationsService.getValidInvitationByToken(
      token,
    );
    const normalizedEmail = googleData.email.trim().toLowerCase();

    if (normalizedEmail !== invitation.email) {
      throw new BadRequestException(
        'Google email does not match the invited address',
      );
    }

    const user = await this.createDoctorUserFromInvitation(invitation, {
      email: normalizedEmail,
      password: null,
      provider: 'google',
      providerId: googleData.googleId,
      firstName: googleData.firstName || 'Google',
      lastName: googleData.lastName || 'User',
      avatarUrl: googleData.picture,
    });

    return this.buildAuthResponse(user);
  }

  private async createDoctorUserFromInvitation(
    invitation: DoctorInvitation,
    userPayload: {
      email: string;
      password: string | null;
      provider: string;
      providerId: string | null;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    },
  ): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const doctorRepository = manager.getRepository(DoctorProfile);
      const invitationRepository = manager.getRepository(DoctorInvitation);

      const existingUser = await userRepository.findOne({
        where: { email: userPayload.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const user = userRepository.create({
        email: userPayload.email,
        password: userPayload.password,
        provider: userPayload.provider,
        providerId: userPayload.providerId,
        phone: null,
        firstName: userPayload.firstName,
        fatherName: null,
        lastName: userPayload.lastName,
        birthDate: null,
        gender: null,
        address: null,
        avatarUrl: userPayload.avatarUrl,
        preferredLanguage: PreferredLanguage.EN,
        themeMode: ThemeMode.SYSTEM,
        role: UserRole.DOCTOR,
        isVerified: true,
      });

      const savedUser = await userRepository.save(user);

      const doctorProfile = doctorRepository.create({
        userId: savedUser.id,
        invitedByAdminId: invitation.invitedByAdminId,
        isApproved: true,
      });

      await doctorRepository.save(doctorProfile);

      invitation.status = DoctorInvitationStatus.ACCEPTED;
      invitation.doctorUserId = savedUser.id;
      await invitationRepository.save(invitation);

      return savedUser;
    });
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


  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const accessPayload = this.buildJwtPayload(user);
    const refreshPayload = this.buildRefreshTokenPayload(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(accessPayload),
      this.generateRefreshToken(refreshPayload),
    ]);

    const decodedToken = this.jwtService.decode(accessToken) as
      | Partial<JWTPayloadType>
      | null;

    if (!decodedToken?.sub) {
      throw new UnauthorizedException('Failed to generate a valid token');
    }

    const profileCompleted = this.isProfileCompleted(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: Number(user.id),
        email: user.email,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim(),
      },
      profileCompleted,
    };
  }

  private buildJwtPayload(user: User): JWTPayloadType {
    return {
      sub: Number(user.id),
      email: user.email,
      usertype: user.role.toUpperCase() as JWTPayloadType['usertype'],
      version: user.tokenVersion,
    };
  }

  private buildRefreshTokenPayload(user: User): RefreshTokenPayload {
    return {
      sub: Number(user.id),
      version: user.tokenVersion,
    };
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new UnauthorizedException('Invalid token configuration');
    }

    return secret;
  }

  private async generateAccessToken(payload: JWTPayloadType): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(
    payload: RefreshTokenPayload,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: '7d',
    });
  }

  private async generateVerificationCode(): Promise<{ code: string; expiresAt: Date }> {
    const code = await this.otpService.generateOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return { code, expiresAt };
  }

  private isProfileCompleted(user: User): boolean {
    const hasFatherName = Boolean(user.fatherName?.trim());
    const hasPhone = Boolean(user.phone?.trim());
    const hasAddress = Boolean(user.address?.trim());

    return Boolean(
      user.gender &&
      user.birthDate &&
      hasFatherName &&
      hasPhone &&
      hasAddress,
    );
  }

}
