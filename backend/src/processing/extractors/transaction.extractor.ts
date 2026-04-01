import { Injectable, Logger } from '@nestjs/common';
import type { ParsedTransaction } from '../parsers/parser.interface.js';

export interface NormalizedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  rawText?: string;
  confidence: number;
  source: string;
}

@Injectable()
export class TransactionExtractor {
  private readonly logger = new Logger(TransactionExtractor.name);

  /**
   * Take raw parsed transactions from any parser and normalize them
   * into a consistent format ready for DB insertion.
   */
  normalize(
    parsed: ParsedTransaction[],
    source: string,
  ): NormalizedTransaction[] {
    const results: NormalizedTransaction[] = [];

    for (const txn of parsed) {
      const normalized = this.normalizeOne(txn, source);
      if (normalized) {
        results.push(normalized);
      }
    }

    // Deduplicate by date + amount + description (same file can have dupes)
    const deduped = this.dedup(results);

    this.logger.log(
      `Normalized ${deduped.length} transactions (${parsed.length} raw) from ${source}`,
    );
    return deduped;
  }

  private normalizeOne(
    txn: ParsedTransaction,
    source: string,
  ): NormalizedTransaction | null {
    // Validate date
    const date = this.normalizeDate(txn.date);
    if (!date) {
      this.logger.debug(`Skipping txn with invalid date: ${String(txn.date)}`);
      return null;
    }

    // Validate amount
    const amount = this.normalizeAmount(txn.amount);
    if (amount <= 0) {
      this.logger.debug(
        `Skipping txn with zero/negative amount: ${txn.amount}`,
      );
      return null;
    }

    // Clean description
    const description = this.normalizeDescription(txn.description);
    if (!description) {
      return null;
    }

    // Infer type if not provided
    const type = txn.type ?? this.inferType(description, amount);

    return {
      date,
      description,
      amount,
      type,
      rawText: txn.rawText,
      confidence: txn.confidence ?? 0.5,
      source,
    };
  }

  normalizeAmount(raw: number | string): number {
    if (typeof raw === 'number') {
      return Math.abs(raw);
    }
    const cleaned = String(raw).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  normalizeDate(raw: Date | string): Date | null {
    if (raw instanceof Date) {
      return isNaN(raw.getTime()) ? null : raw;
    }

    // Try ISO format first
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw));
    if (isoMatch) {
      const d = new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3]),
      );
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY
    const ddMm = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(String(raw));
    if (ddMm) {
      const year =
        ddMm[3].length === 2 ? 2000 + Number(ddMm[3]) : Number(ddMm[3]);
      const d = new Date(year, Number(ddMm[2]) - 1, Number(ddMm[1]));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback native parse
    const fallback = new Date(String(raw));
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  private normalizeDescription(raw: string): string {
    // Remove excess whitespace, special chars, trim
    return raw
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s/&.,#@()-]/g, '')
      .trim()
      .slice(0, 500); // cap at 500 chars
  }

  /**
   * Simple heuristic to infer transaction type from description keywords.
   */
  private inferType(
    description: string,
    _amount: number,
  ): 'INCOME' | 'EXPENSE' {
    const lower = description.toLowerCase();

    const incomeKeywords = [
      'salary',
      'payroll',
      'credit',
      'refund',
      'cashback',
      'interest earned',
      'dividend',
      'reimbursement',
      'bonus',
      'freelance',
      'deposit',
      'received',
    ];

    for (const keyword of incomeKeywords) {
      if (lower.includes(keyword)) return 'INCOME';
    }

    // Default to expense
    return 'EXPENSE';
  }

  private dedup(txns: NormalizedTransaction[]): NormalizedTransaction[] {
    const seen = new Set<string>();
    return txns.filter((txn) => {
      const key = `${txn.date.toISOString()}|${txn.amount}|${txn.description.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
