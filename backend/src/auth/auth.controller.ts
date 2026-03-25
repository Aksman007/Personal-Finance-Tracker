import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // GET /api/auth/google — redirect to Google OAuth
  // GET /api/auth/google/callback — handle callback
  // POST /api/auth/refresh — refresh JWT
  // POST /api/auth/logout — clear session
  // GET /api/auth/me — current user profile
}
