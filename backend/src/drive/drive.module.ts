import { Module } from '@nestjs/common';
import { DriveController } from './drive.controller.js';
import { DriveService } from './drive.service.js';
import { SyncService } from './sync.service.js';

@Module({
  controllers: [DriveController],
  providers: [DriveService, SyncService],
  exports: [DriveService, SyncService],
})
export class DriveModule {}
