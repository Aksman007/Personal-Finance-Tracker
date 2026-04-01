import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import type { FileParser, ParsedTransaction } from './parser.interface.js';

/** Common bank-statement line patterns (date + description + amount) */
const BANK_STATEMENT_PATTERNS = [
  // DD/MM/YYYY  Description  1,234.56  (debit/credit suffix optional)
  /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|DR|CR)?\s*$/,
  // YYYY-MM-DD  Description  -1234.56
  /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([+-]?[\d,]+\.\d{2})\s*$/,
  // MM/DD/YYYY  Description  $1,234.56
  /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$?([\d,]+\.\d{2})\s*$/,
  // DD Mon YYYY  Description  1234.56
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/i,
];

/** Patterns for payslip-style documents */
const PAYSLIP_PATTERNS = [
  // Gross Pay / Net Pay / Basic Salary etc.
  /(?:gross\s*pay|net\s*pay|basic\s*salary|total\s*earnings|take\s*home)\s*[:\s]?\s*\$?([\d,]+\.\d{2})/i,
  // Deductions
  /(?:total\s*deductions?|tax|provident\s*fund|pf)\s*[:\s]?\s*\$?([\d,]+\.\d{2})/i,
];

@Injectable()
export class PdfParser implements FileParser {
  private readonly logger = new Logger(PdfParser.name);

  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParsedTransaction[]> {
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });

    try {
      const textResult = await pdf.getText();
      const text = textResult.text;
      this.logger.debug(`Extracted ${text.length} chars from PDF: ${fileName}`);

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Try bank statement parsing first
      const bankTxns = this.parseBankStatement(lines);
      if (bankTxns.length > 0) {
        this.logger.log(
          `Found ${bankTxns.length} bank transactions in ${fileName}`,
        );
        return bankTxns;
      }

      // Try payslip parsing
      const payslipTxns = this.parsePayslip(lines, text);
      if (payslipTxns.length > 0) {
        this.logger.log(
          `Found ${payslipTxns.length} payslip entries in ${fileName}`,
        );
        return payslipTxns;
      }

      this.logger.warn(
        `No structured data found in PDF: ${fileName}. Returning empty.`,
      );
      return [];
    } finally {
      await pdf.destroy();
    }
  }

  private parseBankStatement(lines: string[]): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      for (const pattern of BANK_STATEMENT_PATTERNS) {
        const match = pattern.exec(line);
        if (match) {
          const [, dateStr, description, amountStr, drCr] = match;
          const date = this.parseDate(dateStr);
          if (!date) continue;

          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (isNaN(amount) || amount === 0) continue;

          // Determine type: Dr/debit = EXPENSE, Cr/credit = INCOME, negative = EXPENSE
          let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
          if (drCr) {
            type = drCr.toUpperCase() === 'CR' ? 'INCOME' : 'EXPENSE';
          } else if (amountStr.startsWith('+')) {
            type = 'INCOME';
          } else if (amountStr.startsWith('-')) {
            type = 'EXPENSE';
          }

          transactions.push({
            date,
            description: description.trim(),
            amount: Math.abs(amount),
            type,
            rawText: line,
            confidence: 0.8,
          });
          break; // matched this line, move to next
        }
      }
    }

    return transactions;
  }

  private parsePayslip(lines: string[], fullText: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Look for net pay / gross pay
    for (const pattern of PAYSLIP_PATTERNS) {
      const match = pattern.exec(fullText);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(amount) || amount === 0) continue;

        const isDeduction = /deduction|tax|provident|pf/i.test(match[0]);

        transactions.push({
          date: this.extractPayslipDate(lines) ?? new Date(),
          description: match[0].split(/[:\s]+/)[0].trim(),
          amount,
          type: isDeduction ? 'EXPENSE' : 'INCOME',
          rawText: match[0],
          confidence: 0.7,
        });
      }
    }

    return transactions;
  }

  private extractPayslipDate(lines: string[]): Date | null {
    // Look for pay period / pay date patterns
    const datePatterns = [
      /(?:pay\s*date|payment\s*date|date)\s*[:\s]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /(?:period|month)\s*[:\s]\s*(\w+\s+\d{4})/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = pattern.exec(line);
        if (match) {
          const parsed = new Date(match[1]);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
    }
    return null;
  }

  private parseDate(dateStr: string): Date | null {
    // Try multiple date formats

    // DD Mon YYYY
    const monthNameMatch =
      /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})$/i.exec(
        dateStr,
      );
    if (monthNameMatch) {
      const parsed = new Date(
        `${monthNameMatch[2]} ${monthNameMatch[1]}, ${monthNameMatch[3]}`,
      );
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // YYYY-MM-DD pattern
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY pattern
    const ddMmYyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(dateStr);
    if (ddMmYyyy) {
      const [, day, month, year] = ddMmYyyy;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YY pattern
    const ddMmYy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/.exec(dateStr);
    if (ddMmYy) {
      const [, day, month, yearShort] = ddMmYy;
      const fullYear = Number(yearShort) + 2000;
      const d = new Date(fullYear, Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback to native Date parsing
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
}
