import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

import {
  ChangePasswordDto,
  DoctorInviteRegisterDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyAccountDto,
  VerifyResetCodeDto,
} from './dto';
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
import { MedicalProfilesService } from '../medical-profiles/medical-profiles.service';
import { OtpService } from './services/otp.service';
import { MailService } from '../mail/mail.service';

type RefreshTokenPayload = Pick<JWTPayloadType, 'sub' | 'version'>;
type AccountStatus = {
  isVerified: boolean;
  isProfileCompleted: boolean;
  role: UserRole;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly adminsService: AdminsService,
    private readonly doctorInvitationsService: DoctorInvitationsService,
    private readonly dataSource: DataSource,
    private readonly authHelperProvider: AuthHelperProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly medicalProfilesService: MedicalProfilesService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) { }

  async register(registerDto: RegisterDto): Promise<User> {
    const normalizedEmail = this.normalizeEmail(registerDto.email);
    const normalizedPhone = this.normalizePhone(registerDto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    const existingUser = await this.findExistingUser(normalizedEmail, normalizedPhone);

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException('User with this email or phone already exists');
      }

      if (this.isGoogleAccount(existingUser)) {
        throw new ConflictException('User with this email or phone already exists');
      }

      const hashedPassword = await this.authHelperProvider.hashPassword(
        registerDto.password,
      );

      const { code, expiresAt } = await this.generateVerificationCode();

      existingUser.password = hashedPassword;
      existingUser.email = normalizedEmail ?? existingUser.email ?? null;
      existingUser.phone = normalizedPhone ?? existingUser.phone ?? null;
      existingUser.firstName = registerDto.firstName;
      existingUser.fatherName = registerDto.fatherName;
      existingUser.lastName = registerDto.lastName;
      existingUser.birthDate = new Date(registerDto.birthDate);
      existingUser.gender = registerDto.gender;
      existingUser.address = registerDto.address;
      existingUser.status = UserStatus.ACTIVE;
      existingUser.avatarUrl = registerDto.avatarUrl ?? null;
      if (registerDto.preferredLanguage !== undefined) {
        existingUser.preferredLanguage = registerDto.preferredLanguage;
      }

      if (registerDto.themeMode !== undefined) {
        existingUser.themeMode = registerDto.themeMode;
      }
      existingUser.role = UserRole.PATIENT;
      existingUser.isVerified = false;
      existingUser.verificationCode = code;
      existingUser.verificationCodeExpiresAt = expiresAt;

      const updatedUser = await this.userRepository.save(existingUser);

      await this.sendVerificationCode(updatedUser, code, {
        preferEmail: Boolean(normalizedEmail),
      });

      return this.userRepository.findOneOrFail({
        where: { id: updatedUser.id },
      });
    }

    const hashedPassword = await this.authHelperProvider.hashPassword(
      registerDto.password,
    );

    const { code, expiresAt } = await this.generateVerificationCode();

    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
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

    await this.sendVerificationCode(savedUser, code, {
      preferEmail: Boolean(normalizedEmail),
    });

    if (savedUser.role === UserRole.ADMIN) {
      await this.adminsService.createAdminProfile(savedUser.id);
    }

    return this.userRepository.findOneOrFail({
      where: { id: savedUser.id },
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto);

    return this.buildAuthResponse(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const normalizedPhone = this.normalizePhone(dto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    const user = await this.findUserByIdentifier(normalizedEmail, normalizedPhone);

    if (this.isGoogleAccount(user)) {
      throw new BadRequestException('Password reset is not supported for Google accounts');
    }

    const { code, expiresAt } = await this.generateVerificationCode();

    user.verificationCode = code;
    user.verificationCodeExpiresAt = expiresAt;

    const savedUser = await this.userRepository.save(user);

    try {
      await this.sendVerificationCode(savedUser, code, {
        preferEmail: Boolean(normalizedEmail),
      });
    } catch (error) {
      this.logger.error('Failed to send reset OTP', error instanceof Error ? error.stack : undefined);
      throw error;
    }

    return { message: 'Reset code sent successfully' };
  }

  

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const normalizedPhone = this.normalizePhone(dto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    const user = await this.findUserByIdentifier(normalizedEmail, normalizedPhone);

    if (this.isGoogleAccount(user)) {
      throw new BadRequestException('Password reset is not supported for Google accounts');
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const expiresAt = new Date(user.verificationCodeExpiresAt);

    if (user.verificationCode !== dto.code || expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const hashedPassword = await this.authHelperProvider.hashPassword(
      dto.newPassword,
    );

    user.password = hashedPassword;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;
    user.tokenVersion = (user.tokenVersion ?? 1) + 1;

    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userWithPassword = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!userWithPassword || !userWithPassword.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.authHelperProvider.comparePassword(
      dto.oldPassword,
      userWithPassword.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashedPassword = await this.authHelperProvider.hashPassword(
      dto.newPassword,
    );

    userWithPassword.password = hashedPassword;
    userWithPassword.tokenVersion = (userWithPassword.tokenVersion ?? 1) + 1;

    await this.userRepository.save(userWithPassword);

    return { message: 'Password changed successfully' };
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

  async verifyAccount(dto: VerifyAccountDto): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const normalizedPhone = this.normalizePhone(dto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    const user = await this.findUserByIdentifier(normalizedEmail, normalizedPhone);

    if (this.isGoogleAccount(user)) {
      throw new BadRequestException('Google accounts do not require verification');
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new UnauthorizedException('Invalid or expired verification code 1');
    }

    const expiresAt = new Date(user.verificationCodeExpiresAt);

    if (user.verificationCode !== dto.code || expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired verification code 2');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Account verified successfully' };
  }

  async resendVerification(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const normalizedPhone = this.normalizePhone(dto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    const user = await this.findUserByIdentifier(normalizedEmail, normalizedPhone);

    if (this.isGoogleAccount(user)) {
      throw new BadRequestException('Google accounts do not require verification');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    const { code, expiresAt } = await this.generateVerificationCode();

    user.verificationCode = code;
    user.verificationCodeExpiresAt = expiresAt;

    await this.userRepository.save(user);

    await this.sendVerificationCode(user, code, {
      preferEmail: Boolean(normalizedEmail),
    });

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
        const completion = await this.medicalProfilesService.getCompletionStatus(userId);
        isProfileCompleted = completion.completed;
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

  async validateUser(loginDto: LoginDto): Promise<User> {
    const normalizedEmail = this.normalizeEmail(loginDto.email);
    const normalizedPhone = this.normalizePhone(loginDto.phone);

    this.assertSingleIdentifier(normalizedEmail, normalizedPhone);

    let userWithPassword: User | null = null;

    if (normalizedEmail) {
      userWithPassword = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('LOWER(user.email) = :email', { email: normalizedEmail })
        .getOne();
    }

    if (!userWithPassword && normalizedPhone) {
      userWithPassword = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.phone = :phone', { phone: normalizedPhone })
        .getOne();
    }

    if (!userWithPassword || !userWithPassword.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.authHelperProvider.comparePassword(
      loginDto.password,
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

  private normalizeEmail(email?: string): string | null {
    if (!email) {
      return null;
    }

    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone) {
      return null;
    }

    const normalized = phone.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private assertSingleIdentifier(email: string | null, phone: string | null): void {
    const hasEmail = Boolean(email);
    const hasPhone = Boolean(phone);

    if (hasEmail === hasPhone) {
      throw new BadRequestException('Provide exactly one of email or phone');
    }
  }

  private isGoogleAccount(user: User): boolean {
    return user.provider === 'google' || user.password === null;
  }

  private async findExistingUser(
    email: string | null,
    phone: string | null,
  ): Promise<User | null> {
    if (email) {
      return this.userRepository.findOne({
        where: { email },
      });


    }

    if (phone) {
      return this.userRepository.findOne({ where: { phone } });
    }

    return null;
  }

  private async findUserByIdentifier(
    email: string | null,
    phone: string | null,
  ): Promise<User> {
    const user = await this.findExistingUser(email, phone);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async sendVerificationCode(
    user: User,
    code: string,
    options: { preferEmail: boolean },
  ): Promise<void> {
    const canSendEmail = Boolean(user.email);
    const canSendPhone = Boolean(user.phone);

    if (options.preferEmail && canSendEmail) {
      await this.mailService.sendVerificationCodeEmail({
        toEmail: user.email as string,
        code,
      });
      return;
    }

    if (canSendPhone) {
      await this.otpService.sendOtpWhatsApp(user.phone as string, code);
      return;
    }

  /*  if (canSendEmail) {
      await this.mailService.sendVerificationCodeEmail({
        toEmail: user.email as string,
        code,
      });
      return;
    }*/

    throw new BadRequestException('User contact information is missing');
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
        email: user.email ?? null,
        phone: user.phone ?? null,
        provider: user.provider,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim(),
      },
      profileCompleted,
    };
  }

  private buildJwtPayload(user: User): JWTPayloadType {
    return {
      sub: Number(user.id),
      email: user.email ?? null,
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
