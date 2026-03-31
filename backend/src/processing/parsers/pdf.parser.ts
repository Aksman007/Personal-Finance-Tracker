import { Injectable } from '@nestjs/common';
import type { FileParser, ParsedTransaction } from './parser.interface.js';

@Injectable()
export class PdfParser implements FileParser {
  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async parse(
    _buffer: Buffer,
    _fileName: string,
  ): Promise<ParsedTransaction[]> {
    // TODO: Implement pdf-parse text extraction
    // TODO: Bank statement pattern matching
    // TODO: Payslip pattern matching
    // TODO: Tesseract.js fallback for scanned PDFs
    return await Promise.resolve([]);
  }
}
