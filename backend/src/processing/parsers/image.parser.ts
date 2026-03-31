import { Injectable } from '@nestjs/common';
import type { FileParser, ParsedTransaction } from './parser.interface.js';

@Injectable()
export class ImageParser implements FileParser {
  supports(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async parse(
    _buffer: Buffer,
    _fileName: string,
  ): Promise<ParsedTransaction[]> {
    // TODO: Tesseract.js OCR extraction
    // TODO: Apply same pattern matching as PDF text
    return await Promise.resolve([]);
  }
}
