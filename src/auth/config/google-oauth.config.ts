import { ConfigService } from '@nestjs/config';

export type GoogleOAuthConfig = {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
};

export const getGoogleOAuthConfig = (
  configService: ConfigService,
): GoogleOAuthConfig => {
  const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
  const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

  if (!clientID) {
    throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
  }

  if (!clientSecret) {
    throw new Error('Missing required environment variable: GOOGLE_CLIENT_SECRET');
  }

  return {
    clientID,
    clientSecret,
    callbackURL:
      configService.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:3000/auth/google/callback',
  };
};
