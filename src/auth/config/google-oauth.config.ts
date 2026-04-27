import { ConfigService } from '@nestjs/config';

export type GoogleOAuthConfig = {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
};

export const getGoogleOAuthConfig = (
  configService: ConfigService,
): GoogleOAuthConfig => {
  return {
    clientID:
      configService.get<string>('GOOGLE_CLIENT_ID') ??
      'GOOGLE_CLIENT_ID_PLACEHOLDER',
    clientSecret:
      configService.get<string>('GOOGLE_CLIENT_SECRET') ??
      'GOOGLE_CLIENT_SECRET_PLACEHOLDER',
    callbackURL:
      configService.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:3000/auth/google/callback',
  };
};
