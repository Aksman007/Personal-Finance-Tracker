import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Poll Drive folder for new/modified files
  // TODO: Enqueue new files for processing via BullMQ
  // TODO: Deduplication by file hash
}
