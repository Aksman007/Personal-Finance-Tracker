import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { encrypt, decrypt } from '../common/crypto.util.js';

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  type?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser) {
    const user = await this.prisma.user.upsert({
      where: { googleId: googleUser.googleId },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        accessToken: encrypt(googleUser.accessToken),
        refreshToken: googleUser.refreshToken
          ? encrypt(googleUser.refreshToken)
          : undefined,
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
      },
      create: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        accessToken: encrypt(googleUser.accessToken),
        refreshToken: encrypt(googleUser.refreshToken || ''),
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
      },
    });
    return user;
  }

  generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email } as Record<string, unknown>,
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    );
  }

  generateRefreshToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email, type: 'refresh' } as Record<string, unknown>,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    );
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) throw new UnauthorizedException('User not found');

      return {
        accessToken: this.generateAccessToken(user.id, user.email),
        user,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        createdAt: true,
      },
    });
  }

  getDecryptedGoogleToken(encryptedToken: string): string {
    return decrypt(encryptedToken);
  }
}
