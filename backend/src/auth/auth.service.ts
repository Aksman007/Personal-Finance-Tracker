import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement Google OAuth user creation/lookup
  // TODO: Implement JWT token generation
  // TODO: Implement token refresh logic
}
