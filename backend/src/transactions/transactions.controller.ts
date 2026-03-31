import { Controller } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // GET /api/transactions — list (paginated, filtered)
  // GET /api/transactions/:id — get one
  // PATCH /api/transactions/:id — update (re-categorize)
  // DELETE /api/transactions/:id — delete
}
