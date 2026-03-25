import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DriveService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement Google Drive API folder listing
  // TODO: Implement drive config CRUD
}
