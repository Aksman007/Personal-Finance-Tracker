import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { DriveService } from './drive.service.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService,
    @InjectQueue('file-processing') private readonly fileQueue: Queue,
  ) {}

  async syncAllConfigs(userId: string) {
    const configs = await this.prisma.driveConfig.findMany({
      where: { userId, syncEnabled: true },
    });

    let totalNewFiles = 0;
    for (const config of configs) {
      const newFiles = await this.syncFolder(
        userId,
        config.id,
        config.folderId,
      );
      totalNewFiles += newFiles;
    }

    return { configsSynced: configs.length, newFilesQueued: totalNewFiles };
  }

  async syncFolder(
    userId: string,
    configId: string,
    folderId: string,
  ): Promise<number> {
    this.logger.log(`Syncing folder ${folderId} for config ${configId}`);

    const driveFiles = await this.driveService.listFiles(userId, folderId);

    // Get already-processed file IDs for this config
    const existingFiles = await this.prisma.processedFile.findMany({
      where: { driveConfigId: configId },
      select: { driveFileId: true, fileHash: true, status: true },
    });

    const existingMap = new Map(existingFiles.map((f) => [f.driveFileId, f]));

    let enqueued = 0;

    for (const file of driveFiles) {
      const existing = existingMap.get(file.id);

      // Skip if already completed with same hash
      if (
        existing &&
        existing.status === 'COMPLETED' &&
        existing.fileHash === file.md5Checksum
      ) {
        continue;
      }

      // Skip if currently processing
      if (existing && existing.status === 'PROCESSING') {
        continue;
      }

      // Create or update ProcessedFile record
      const processedFile = await this.prisma.processedFile.upsert({
        where: {
          driveConfigId_driveFileId: {
            driveConfigId: configId,
            driveFileId: file.id,
          },
        },
        update: {
          fileName: file.name,
          mimeType: file.mimeType,
          fileHash: file.md5Checksum,
          status: 'PENDING',
          errorMessage: null,
        },
        create: {
          driveConfigId: configId,
          driveFileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          fileHash: file.md5Checksum,
          status: 'PENDING',
        },
      });

      // Enqueue for processing
      await this.fileQueue.add(
        'process-file',
        {
          processedFileId: processedFile.id,
          driveFileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          userId,
          configId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      enqueued++;
    }

    // Update lastSyncAt
    await this.prisma.driveConfig.update({
      where: { id: configId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `Sync complete for ${configId}: ${enqueued} new files queued`,
    );
    return enqueued;
  }
}
