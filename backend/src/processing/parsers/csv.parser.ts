import { Injectable } from '@nestjs/common';
import type { FileParser, ParsedTransaction } from './parser.interface.js';

@Injectable()
export class CsvParser implements FileParser {
  supports(mimeType: string): boolean {
    return mimeType === 'text/csv' || mimeType === 'application/csv';
  }

  async parse(
    buffer: Buffer,
    fileName: string,
  ): Promise<ParsedTransaction[]> {
    // TODO: Implement csv-parser with auto-detect delimiter
    // TODO: Column mapping heuristics
    // TODO: Date/amount normalization
    return [];
  }
}
