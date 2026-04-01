'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '@/lib/api-client';
import type { DriveConfig, ProcessedFile } from '@/types';
import FolderPicker from '@/components/drive/folder-picker';
import SavedConfigs from '@/components/drive/saved-configs';
import FileStatusTable from '@/components/drive/file-status';

export default function SetupPage() {
  const [configs, setConfigs] = useState<DriveConfig[]>([]);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await apiClient.get<DriveConfig[]>('/drive/config');
      setConfigs(res.data);
    } catch {
      // handled by api-client interceptor
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await apiClient.get<ProcessedFile[]>('/drive/files');
      setFiles(res.data);
    } catch {
      // handled by api-client interceptor
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfigs();
    void fetchFiles();
  }, [fetchConfigs, fetchFiles]);

  const handleSelect = async (folderId: string, folderName: string) => {
    setSaving(true);
    try {
      await apiClient.post('/drive/config', { folderId, folderName });
      setPickerOpen(false);
      await fetchConfigs();
    } catch {
      // error toast could go here
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      await apiClient.delete(`/drive/config/${configId}`);
      await fetchConfigs();
      await fetchFiles();
    } catch {
      // handled by api-client interceptor
    }
  };

  const handleSync = async () => {
    setSyncingId('all');
    try {
      await apiClient.post('/drive/sync');
      await fetchConfigs();
      await fetchFiles();
    } catch {
      // handled by api-client interceptor
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Google Drive Setup
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Select folders containing your bank statements, payslips, or financial
          documents.
        </p>
      </div>

      {/* Folder Picker (collapsible) */}
      <section>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>Browse Drive Folders</span>
          {pickerOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {pickerOpen && (
          <div className="mt-2">
            <FolderPicker onSelect={handleSelect} disabled={saving} />
          </div>
        )}
      </section>

      {/* Saved Configs */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Monitored Folders
        </h2>
        {loadingConfigs ? (
          <div className="py-6 text-center text-sm text-gray-400">
            Loading configurations...
          </div>
        ) : (
          <SavedConfigs
            configs={configs}
            syncingId={syncingId}
            onSync={handleSync}
            onDelete={handleDelete}
          />
        )}
      </section>

      {/* Processed Files */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Processed Files
        </h2>
        <FileStatusTable files={files} loading={loadingFiles} />
      </section>
    </div>
  );
}
