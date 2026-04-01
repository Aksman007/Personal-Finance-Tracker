'use client';

import { FileText, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { FileStatus as FileStatusEnum } from '@/types';
import type { ProcessedFile } from '@/types';

interface FileStatusProps {
  files: ProcessedFile[];
  loading: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  [FileStatusEnum.PENDING]: 'bg-amber-50 text-amber-700',
  [FileStatusEnum.PROCESSING]: 'bg-blue-50 text-blue-700',
  [FileStatusEnum.COMPLETED]: 'bg-green-50 text-green-700',
  [FileStatusEnum.FAILED]: 'bg-red-50 text-red-700',
  [FileStatusEnum.SKIPPED]: 'bg-gray-100 text-gray-500',
};

function mimeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('csv')) return 'CSV';
  if (mimeType.startsWith('image/')) return 'Image';
  return mimeType.split('/').pop() ?? 'File';
}

export default function FileStatusTable({ files, loading }: FileStatusProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading files...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">
          No files processed yet. Sync a folder to start processing.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-2.5 font-medium text-gray-600">File</th>
            <th className="px-4 py-2.5 font-medium text-gray-600">Type</th>
            <th className="px-4 py-2.5 font-medium text-gray-600">Status</th>
            <th className="px-4 py-2.5 font-medium text-gray-600">
              Processed
            </th>
            <th className="px-4 py-2.5 font-medium text-gray-600">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-900">
                {file.fileName}
              </td>
              <td className="px-4 py-2.5 text-gray-500">
                {mimeLabel(file.mimeType)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[file.status] ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {file.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500">
                {file.processedAt ? formatDate(file.processedAt) : '—'}
              </td>
              <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-gray-400">
                {file.errorMessage ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
