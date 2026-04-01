'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, ChevronRight, Check, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import type { DriveFolder } from '@/types';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface FolderPickerProps {
  onSelect: (folderId: string, folderName: string) => void;
  disabled?: boolean;
}

export default function FolderPicker({ onSelect, disabled }: FolderPickerProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const fetchFolders = useCallback(async (parentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const url =
        parentId === 'root' ? '/drive/folders' : `/drive/folders/${parentId}`;
      const res = await apiClient.get<DriveFolder[]>(url);
      setFolders(res.data);
    } catch {
      setError('Failed to load folders. Check your Google Drive connection.');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFolders(currentFolder.id);
  }, [currentFolder.id, fetchFolders]);

  const handleFolderClick = (folder: DriveFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleSelect = () => {
    onSelect(currentFolder.id, currentFolder.name);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-4 py-3 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className={`rounded px-1.5 py-0.5 hover:bg-gray-100 ${
                i === breadcrumbs.length - 1
                  ? 'font-medium text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folder list */}
      <div className="max-h-64 min-h-[160px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading folders...
          </div>
        )}

        {error && (
          <div className="px-4 py-10 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && folders.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            No subfolders found
          </div>
        )}

        {!loading &&
          !error &&
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
            >
              <Folder className="h-5 w-5 text-blue-500" />
              <span className="truncate text-gray-700">{folder.name}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
            </button>
          ))}
      </div>

      {/* Select button */}
      <div className="border-t border-gray-200 px-4 py-3">
        <button
          onClick={handleSelect}
          disabled={disabled || currentFolder.id === 'root'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Check className="h-4 w-4" />
          Select &ldquo;{currentFolder.name}&rdquo;
        </button>
        {currentFolder.id === 'root' && (
          <p className="mt-1.5 text-center text-xs text-gray-400">
            Navigate into a folder to select it
          </p>
        )}
      </div>
    </div>
  );
}
