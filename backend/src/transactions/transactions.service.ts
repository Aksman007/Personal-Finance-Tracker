import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement CRUD for transactions
  // TODO: Implement filtered/paginated listing
}
