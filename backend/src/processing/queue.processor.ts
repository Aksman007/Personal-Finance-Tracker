import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { DriveService } from '../drive/drive.service.js';
import { PdfParser } from './parsers/pdf.parser.js';
import { CsvParser } from './parsers/csv.parser.js';
import { ImageParser } from './parsers/image.parser.js';
import { TransactionExtractor } from './extractors/transaction.extractor.js';
import type { NormalizedTransaction } from './extractors/transaction.extractor.js';
import { RuleCategorizer } from './categorizer/rule.categorizer.js';
import type { FileParser } from './parsers/parser.interface.js';

interface FileJobData {
  processedFileId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  userId: string;
  configId: string;
}

@Processor('file-processing')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly parsers: FileParser[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService,
    private readonly pdfParser: PdfParser,
    private readonly csvParser: CsvParser,
    private readonly imageParser: ImageParser,
    private readonly extractor: TransactionExtractor,
    private readonly categorizer: RuleCategorizer,
  ) {
    super();
    this.parsers = [this.pdfParser, this.csvParser, this.imageParser];
  }

  async process(job: Job<FileJobData>): Promise<void> {
    const { processedFileId, driveFileId, fileName, mimeType, userId } =
      job.data;

    this.logger.log(
      `Processing file: ${fileName} (${mimeType}) [job ${job.id}]`,
    );

    try {
      // 1. Mark as PROCESSING
      await this.prisma.processedFile.update({
        where: { id: processedFileId },
        data: { status: 'PROCESSING' },
      });

      // 2. Find the right parser
      const parser = this.parsers.find((p) => p.supports(mimeType));
      if (!parser) {
        throw new Error(`No parser found for MIME type: ${mimeType}`);
      }

      // 3. Download file from Google Drive
      await job.updateProgress(10);
      const buffer = await this.driveService.downloadFile(userId, driveFileId);
      this.logger.debug(`Downloaded ${fileName}: ${buffer.length} bytes`);

      // 4. Parse the file
      await job.updateProgress(30);
      const rawTransactions = await parser.parse(buffer, fileName);
      this.logger.debug(
        `Parsed ${rawTransactions.length} raw transactions from ${fileName}`,
      );

      if (rawTransactions.length === 0) {
        // Mark as completed with no transactions
        await this.prisma.processedFile.update({
          where: { id: processedFileId },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            errorMessage: 'No transactions found in file',
          },
        });
        return;
      }

      // 5. Normalize transactions
      await job.updateProgress(50);
      const normalized = this.extractor.normalize(rawTransactions, fileName);

      // 6. Categorize transactions
      await job.updateProgress(70);
      const categorized = await this.categorizer.categorizeMany(
        normalized.map((t) => ({
          description: t.description,
          type: t.type,
        })),
      );

      // 7. Save transactions to DB
      await job.updateProgress(90);
      await this.saveTransactions(
        userId,
        processedFileId,
        normalized,
        categorized.map((c) => c.categoryId),
      );

      // 8. Mark file as COMPLETED
      await this.prisma.processedFile.update({
        where: { id: processedFileId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      await job.updateProgress(100);
      this.logger.log(
        `Completed processing ${fileName}: ${normalized.length} transactions saved`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process ${fileName}: ${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Mark file as FAILED
      await this.prisma.processedFile.update({
        where: { id: processedFileId },
        data: {
          status: 'FAILED',
          errorMessage: errorMsg.slice(0, 1000),
        },
      });

      throw error; // Re-throw so BullMQ can handle retries
    }
  }

  private async saveTransactions(
    userId: string,
    processedFileId: string,
    transactions: NormalizedTransaction[],
    categoryIds: (string | null)[],
  ): Promise<void> {
    // Use a Prisma transaction to insert all at once
    await this.prisma.$transaction(
      transactions.map((txn, i) =>
        this.prisma.transaction.create({
          data: {
            userId,
            fileId: processedFileId,
            date: txn.date,
            description: txn.description,
            amount: txn.amount,
            type: txn.type,
            categoryId: categoryIds[i] ?? undefined,
            rawText: txn.rawText,
            confidence: txn.confidence,
            source: txn.source,
          },
        }),
      ),
    );

    this.logger.debug(
      `Saved ${transactions.length} transactions for file ${processedFileId}`,
    );
  }
}
