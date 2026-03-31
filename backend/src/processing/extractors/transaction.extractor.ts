import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionExtractor {
  // TODO: Unified extraction interface
  // TODO: Date parsing (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
  // TODO: Amount parsing (currency symbols, commas, negatives, parentheses)
  // TODO: Type inference (income vs expense)

  normalizeAmount(raw: string): number {
    const cleaned = raw.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  normalizeDate(raw: string): Date | null {
    // TODO: Support multiple date formats
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
