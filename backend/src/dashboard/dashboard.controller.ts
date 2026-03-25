import { Controller } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard/summary — KPI cards data
  // GET /api/dashboard/income-expense — bar/line chart
  // GET /api/dashboard/categories — pie chart
  // GET /api/dashboard/cashflow — time-series
  // GET /api/dashboard/anomalies — outlier detection
  // GET /api/dashboard/insights — AI-generated summary
}
