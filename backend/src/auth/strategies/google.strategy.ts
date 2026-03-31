import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    } as any);
  }

  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: Record<string, string>) => void,
  ): void {
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName,
      picture: profile.photos?.[0]?.value ?? '',
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
