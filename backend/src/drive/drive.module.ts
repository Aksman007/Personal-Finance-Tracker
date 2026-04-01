import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module.js';
import { DriveController } from './drive.controller.js';
import { DriveService } from './drive.service.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: 'file-processing' })],
  controllers: [DriveController],
  providers: [DriveService, SyncService],
  exports: [DriveService, SyncService],
})
export class DriveModule {}
