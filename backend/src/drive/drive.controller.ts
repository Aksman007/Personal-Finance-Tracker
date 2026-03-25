import { Controller } from '@nestjs/common';
import { DriveService } from './drive.service.js';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  // GET /api/drive/folders — list root folders
  // GET /api/drive/folders/:id — list subfolders
  // POST /api/drive/config — save folder config
  // GET /api/drive/config — get current config
  // DELETE /api/drive/config/:id — remove config
  // POST /api/drive/sync — manual sync trigger
  // GET /api/drive/files — list processed files
}
