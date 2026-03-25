import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement KPI summary aggregation
  // TODO: Implement income vs expense time-series
  // TODO: Implement category breakdown
  // TODO: Implement cash flow calculation
}
