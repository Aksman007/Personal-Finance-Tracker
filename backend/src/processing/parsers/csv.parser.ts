import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import type { FileParser, ParsedTransaction } from './parser.interface.js';

/**
 * Heuristic column name mappings.
 * Each key is our canonical field; values are common CSV header variations.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: [
    'date',
    'transaction date',
    'trans date',
    'posting date',
    'value date',
    'txn date',
    'payment date',
    'created',
    'timestamp',
    'booked',
  ],
  description: [
    'description',
    'narration',
    'particulars',
    'details',
    'memo',
    'transaction description',
    'remarks',
    'reference',
    'payee',
    'name',
  ],
  amount: ['amount', 'transaction amount', 'value', 'sum', 'total'],
  debit: ['debit', 'debit amount', 'withdrawal', 'dr', 'money out', 'expense'],
  credit: ['credit', 'credit amount', 'deposit', 'cr', 'money in', 'income'],
  type: ['type', 'transaction type', 'txn type', 'dr/cr', 'debit/credit'],
};

interface ColumnMap {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  type?: string;
}

@Injectable()
export class CsvParser implements FileParser {
  private readonly logger = new Logger(CsvParser.name);

  supports(mimeType: string): boolean {
    return mimeType === 'text/csv' || mimeType === 'application/csv';
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParsedTransaction[]> {
    const rows = await this.readCsv(buffer);

    if (rows.length === 0) {
      this.logger.warn(`No data rows found in CSV: ${fileName}`);
      return [];
    }

    // Map columns using heuristics
    const headers = Object.keys(rows[0]);
    const columnMap = this.detectColumns(headers);

    if (!columnMap.date || !columnMap.description) {
      this.logger.warn(
        `Could not detect date/description columns in ${fileName}. Headers: ${headers.join(', ')}`,
      );
      return [];
    }

    if (!columnMap.amount && !columnMap.debit && !columnMap.credit) {
      this.logger.warn(
        `Could not detect amount columns in ${fileName}. Headers: ${headers.join(', ')}`,
      );
      return [];
    }

    this.logger.debug(
      `Column mapping for ${fileName}: ${JSON.stringify(columnMap)}`,
    );

    const transactions: ParsedTransaction[] = [];

    for (const row of rows) {
      const txn = this.parseRow(row, columnMap);
      if (txn) {
        transactions.push(txn);
      }
    }

    this.logger.log(
      `Parsed ${transactions.length} transactions from CSV: ${fileName}`,
    );
    return transactions;
  }

  private async readCsv(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(
          csvParser({
            mapHeaders: ({ header }) => header.trim().toLowerCase(),
            skipLines: 0,
          }),
        )
        .on('data', (row: Record<string, string>) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', (err: Error) => reject(err));
    });
  }

  private detectColumns(headers: string[]): ColumnMap {
    const map: ColumnMap = {};
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const alias of aliases) {
        const idx = normalizedHeaders.findIndex(
          (h) => h === alias || h.includes(alias),
        );
        if (idx !== -1) {
          (map as Record<string, string>)[canonical] = headers[idx];
          break;
        }
      }
    }

    return map;
  }

  private parseRow(
    row: Record<string, string>,
    columnMap: ColumnMap,
  ): ParsedTransaction | null {
    // Extract date
    const dateStr = row[columnMap.date!]?.trim();
    if (!dateStr) return null;
    const date = this.parseDate(dateStr);
    if (!date) return null;

    // Extract description
    const description = row[columnMap.description!]?.trim();
    if (!description) return null;

    // Extract amount and determine type
    let amount: number;
    let type: 'INCOME' | 'EXPENSE';

    if (columnMap.debit && columnMap.credit) {
      // Separate debit/credit columns
      const debitStr = row[columnMap.debit]?.trim();
      const creditStr = row[columnMap.credit]?.trim();
      const debit = this.parseAmount(debitStr);
      const credit = this.parseAmount(creditStr);

      if (credit > 0) {
        amount = credit;
        type = 'INCOME';
      } else if (debit > 0) {
        amount = debit;
        type = 'EXPENSE';
      } else {
        return null; // No valid amount
      }
    } else if (columnMap.amount) {
      // Single amount column
      const amountStr = row[columnMap.amount]?.trim();
      const parsed = this.parseAmount(amountStr);
      if (parsed === 0) return null;

      amount = Math.abs(parsed);

      // Determine type from sign, type column, or default to EXPENSE
      if (columnMap.type) {
        const typeStr = row[columnMap.type]?.trim().toLowerCase();
        type =
          typeStr === 'cr' || typeStr === 'credit' || typeStr === 'income'
            ? 'INCOME'
            : 'EXPENSE';
      } else {
        type = parsed >= 0 ? 'INCOME' : 'EXPENSE';
      }
    } else {
      return null;
    }

    const rawText = Object.values(row).join(' | ');

    return {
      date,
      description,
      amount,
      type,
      rawText,
      confidence: 0.9, // CSV is structured, high confidence
    };
  }

  private parseAmount(str: string | undefined): number {
    if (!str) return 0;
    // Remove currency symbols, spaces, and commas
    const cleaned = str.replace(/[₹$€£¥\s,]/g, '').trim();
    if (!cleaned || cleaned === '-' || cleaned === '') return 0;
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  private parseDate(dateStr: string): Date | null {
    // DD/MM/YYYY or DD-MM-YYYY
    const ddMm = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(dateStr);
    if (ddMm) {
      const [, day, month, year] = ddMm;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (iso) {
      const [, year, month, day] = iso;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // MM/DD/YYYY
    const mmDd = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
    if (mmDd) {
      const [, month, day, year] = mmDd;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
}
