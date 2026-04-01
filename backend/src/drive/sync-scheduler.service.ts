import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SyncService } from './sync.service.js';

@Injectable()
export class SyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const intervalMs = this.configService.get<number>(
      'DRIVE_SYNC_INTERVAL_MS',
      300_000,
    );

    const interval = setInterval(() => {
      void this.runSync();
    }, intervalMs);

    this.schedulerRegistry.addInterval('drive-sync', interval);
    this.logger.log(`Scheduled Drive sync every ${intervalMs}ms`);
  }

  private async runSync() {
    this.logger.log('Starting scheduled Drive sync...');
    try {
      const result = await this.syncService.syncAllUsers();
      this.logger.log(
        `Scheduled sync done: ${result.usersSynced} users, ${result.totalFilesQueued} files`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
