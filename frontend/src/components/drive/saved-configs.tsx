'use client';

import { FolderOpen, RefreshCw, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DriveConfig } from '@/types';

interface SavedConfigsProps {
  configs: DriveConfig[];
  syncingId: string | null;
  onSync: () => void;
  onDelete: (configId: string) => void;
}

export default function SavedConfigs({
  configs,
  syncingId,
  onSync,
  onDelete,
}: SavedConfigsProps) {
  if (configs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
        <FolderOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">
          No folders configured yet. Select a folder above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {config.folderName}
              </p>
              <p className="text-xs text-gray-400">
                {config.lastSyncAt
                  ? `Last synced ${formatDate(config.lastSyncAt)}`
                  : 'Never synced'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                config.syncEnabled
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {config.syncEnabled ? 'Active' : 'Disabled'}
            </span>

            <button
              onClick={onSync}
              disabled={syncingId !== null}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              title="Sync now"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncingId === config.id ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              onClick={() => onDelete(config.id)}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Remove folder"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
