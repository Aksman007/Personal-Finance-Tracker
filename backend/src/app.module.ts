import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DriveModule } from './drive/drive.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ProcessingModule } from './processing/processing.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DriveModule,
    TransactionsModule,
    DashboardModule,
    ProcessingModule,
  ],
})
export class AppModule {}
