import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { getGoogleOAuthConfig } from '../config';

export type GoogleUserData = {
  email: string;
  firstName: string;
  lastName: string;
  googleId: string;
  picture: string | null;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const googleOAuthConfig = getGoogleOAuthConfig(configService);

    super({
      clientID: googleOAuthConfig.clientID,
      clientSecret: googleOAuthConfig.clientSecret,
      callbackURL: googleOAuthConfig.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GoogleUserData> {
    void accessToken;
    void refreshToken;

    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Google profile does not include an email');
    }

    return {
      email: email.toLowerCase(),
      firstName: profile.name?.givenName ?? 'Google',
      lastName: profile.name?.familyName ?? 'User',
      googleId: profile.id,
      picture: profile.photos?.[0]?.value ?? null,
    };
  }
}
