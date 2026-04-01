import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size: string;
  md5Checksum?: string;
}

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async getDriveClient(userId: string): Promise<drive_v3.Drive> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { accessToken: true, refreshToken: true },
    });

    const accessToken = this.authService.getDecryptedGoogleToken(
      user.accessToken,
    );
    const refreshToken = this.authService.getDecryptedGoogleToken(
      user.refreshToken,
    );

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Auto-refresh expired tokens and save back to DB
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        void this.prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: this.authService.getDecryptedGoogleToken(
              tokens.access_token,
            ),
            tokenExpiry: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : new Date(Date.now() + 3600 * 1000),
          },
        });
      }
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  async listFolders(userId: string, parentId?: string): Promise<DriveFolder[]> {
    const drive = await this.getDriveClient(userId);
    const parent = parentId || 'root';

    const res = await drive.files.list({
      q: `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      orderBy: 'name',
      pageSize: 100,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime ?? undefined,
    }));
  }

  async listFiles(userId: string, folderId: string): Promise<DriveFile[]> {
    const drive = await this.getDriveClient(userId);

    const supportedTypes = [
      "mimeType='application/pdf'",
      "mimeType='text/csv'",
      "mimeType='application/csv'",
      "mimeType='image/png'",
      "mimeType='image/jpeg'",
    ].join(' or ');

    const res = await drive.files.list({
      q: `'${folderId}' in parents and (${supportedTypes}) and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, size, md5Checksum)',
      orderBy: 'modifiedTime desc',
      pageSize: 200,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime!,
      size: f.size || '0',
      md5Checksum: f.md5Checksum ?? undefined,
    }));
  }

  async downloadFile(userId: string, fileId: string): Promise<Buffer> {
    const drive = await this.getDriveClient(userId);

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );

    return Buffer.from(res.data as ArrayBuffer);
  }

  // ─── Drive Config CRUD ───

  async saveConfig(userId: string, folderId: string, folderName: string) {
    return this.prisma.driveConfig.upsert({
      where: { userId_folderId: { userId, folderId } },
      update: { folderName, syncEnabled: true },
      create: { userId, folderId, folderName },
    });
  }

  async getConfigs(userId: string) {
    return this.prisma.driveConfig.findMany({
      where: { userId },
      include: {
        _count: { select: { processedFiles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteConfig(userId: string, configId: string) {
    return this.prisma.driveConfig.deleteMany({
      where: { id: configId, userId },
    });
  }

  async getProcessedFiles(userId: string) {
    return this.prisma.processedFile.findMany({
      where: { driveConfig: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
