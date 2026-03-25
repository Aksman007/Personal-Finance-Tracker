import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor.js';
import { PdfParser } from './parsers/pdf.parser.js';
import { CsvParser } from './parsers/csv.parser.js';
import { ImageParser } from './parsers/image.parser.js';
import { TransactionExtractor } from './extractors/transaction.extractor.js';
import { RuleCategorizer } from './categorizer/rule.categorizer.js';
import { AiCategorizer } from './categorizer/ai.categorizer.js';

@Module({
  providers: [
    QueueProcessor,
    PdfParser,
    CsvParser,
    ImageParser,
    TransactionExtractor,
    RuleCategorizer,
    AiCategorizer,
  ],
  exports: [QueueProcessor],
})
export class ProcessingModule {}
