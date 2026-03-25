export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export enum FileStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  fileId: string | null;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  rawText: string | null;
  confidence: number | null;
  source: string | null;
  createdAt: string;
}

export interface DriveConfig {
  id: string;
  userId: string;
  folderId: string;
  folderName: string;
  lastSyncAt: string | null;
  syncEnabled: boolean;
}

export interface ProcessedFile {
  id: string;
  driveConfigId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  status: FileStatus;
  errorMessage: string | null;
  processedAt: string | null;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  maxSpend: {
    amount: number;
    description: string;
    date: string;
  } | null;
  avgMonthlySpend: number;
  transactionCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}
