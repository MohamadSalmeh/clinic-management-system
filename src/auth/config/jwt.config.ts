import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { StringValue } from 'ms';

export const getJwtConfig = async (
  configService: ConfigService,
): Promise<JwtModuleOptions> => {
  const secret = configService.get<string>('JWT_SECRET');
  const expiresInRaw = configService.get<string>('JWT_EXPIRES_IN') ?? '1h';
  const expiresIn = /^\d+$/.test(expiresInRaw)
    ? Number(expiresInRaw)
    : (expiresInRaw as StringValue);

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return {
    secret,
    signOptions: {
      expiresIn,
    },
  };
};
