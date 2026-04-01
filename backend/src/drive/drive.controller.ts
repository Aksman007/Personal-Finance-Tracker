import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { DriveService } from './drive.service.js';
import { SyncService } from './sync.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('drive')
@UseGuards(JwtAuthGuard)
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly syncService: SyncService,
  ) {}

  @Get('folders')
  async listRootFolders(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.listFolders(userId);
  }

  @Get('folders/:id')
  async listSubFolders(@Req() req: Request, @Param('id') parentId: string) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.listFolders(userId, parentId);
  }

  @Post('config')
  async saveConfig(
    @Req() req: Request,
    @Body() body: { folderId: string; folderName: string },
  ) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.saveConfig(userId, body.folderId, body.folderName);
  }

  @Get('config')
  async getConfig(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.getConfigs(userId);
  }

  @Delete('config/:id')
  async deleteConfig(@Req() req: Request, @Param('id') configId: string) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.deleteConfig(userId, configId);
  }

  @Post('sync')
  async triggerSync(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    const result = await this.syncService.syncAllConfigs(userId);
    return { message: 'Sync triggered', ...result };
  }

  @Get('files')
  async listProcessedFiles(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.driveService.getProcessedFiles(userId);
  }
}
