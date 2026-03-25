import { Injectable } from '@nestjs/common';

@Injectable()
export class QueueProcessor {
  // TODO: BullMQ processor for file processing jobs
  // TODO: Download file from Drive API (stream)
  // TODO: Route to correct parser by MIME type
  // TODO: Save extracted transactions to DB
  // TODO: Update ProcessedFile status
}
