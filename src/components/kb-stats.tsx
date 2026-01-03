'use client';

import { KnowledgeBase } from '@/types';

interface KBStatsProps {
  kb?: KnowledgeBase;
  totalFiles: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function KBStats({ kb, totalFiles }: KBStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="card">
        <p className="text-small text-text-secondary mb-1">Files Uploaded</p>
        <p className="text-display text-3xl font-bold text-accent">{totalFiles}</p>
      </div>

      <div className="card">
        <p className="text-small text-text-secondary mb-1">Content Size</p>
        <p className="text-display text-3xl font-bold">
          {kb?.storageUsed ? formatBytes(kb.storageUsed) : '0 B'}
        </p>
      </div>

      <div className="card">
        <p className="text-small text-text-secondary mb-1">Last Updated</p>
        <p className="text-body font-semibold">
          {kb?.updatedAt ? new Date(kb.updatedAt).toLocaleDateString() : 'Never'}
        </p>
      </div>
    </div>
  );
}
