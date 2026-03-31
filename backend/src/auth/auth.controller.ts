import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {
    // Guard redirects to Google OAuth consent screen
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const googleUser = req.user as {
      googleId: string;
      email: string;
      name: string;
      picture?: string;
      accessToken: string;
      refreshToken: string;
    };
    const user = await this.authService.validateGoogleUser(googleUser);

    const accessToken = this.authService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = this.authService.generateRefreshToken(
      user.id,
      user.email,
    );

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    res.redirect(`${frontendUrl}/dashboard`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.authService.getUserProfile(user.id);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, user } =
      await this.authService.refreshAccessToken(refreshToken);

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: 'Token refreshed', user });
  }

  @Post('logout')
  logout(@Res() res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ message: 'Logged out' });
  }
}
