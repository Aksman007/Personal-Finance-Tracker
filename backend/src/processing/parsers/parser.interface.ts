export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  rawText?: string;
  confidence?: number;
}

export interface FileParser {
  parse(buffer: Buffer, fileName: string): Promise<ParsedTransaction[]>;
  supports(mimeType: string): boolean;
}
