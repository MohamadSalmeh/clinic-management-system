import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { StringValue } from 'ms';
import { JWTPayloadType, SALT_ROUNDS } from '../../utils';

type JWTInputType = JWTPayloadType & Partial<{ id: number }>;

@Injectable()
export class AuthHelperProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async generateJWT(payload: JWTPayloadType): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h';
    const expiresIn = /^\d+$/.test(expiresInRaw)
      ? Number(expiresInRaw)
      : (expiresInRaw as StringValue);

    const jwtInput = payload as JWTInputType;
    const normalizedPayload: JWTPayloadType = {
      ...payload,
      sub: Number(jwtInput.id ?? payload.sub),
      usertype: payload.usertype.toUpperCase() as JWTPayloadType['usertype'],
    };

    return this.jwtService.signAsync(normalizedPayload, {
      secret,
      expiresIn,
    });
  }
}
