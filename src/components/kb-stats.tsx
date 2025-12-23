'use client';

import { KnowledgeBase } from '@/types';

interface KBStatsProps {
  kb?: KnowledgeBase;
  totalFiles: number;
}

export function KBStats({ kb, totalFiles }: KBStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="card">
        <p className="text-small text-text-secondary mb-1">Total Chunks</p>
        <p className="text-display text-3xl font-bold text-accent">
          {kb?.totalChunks || 0}
        </p>
      </div>

      <div className="card">
        <p className="text-small text-text-secondary mb-1">Files Uploaded</p>
        <p className="text-display text-3xl font-bold">{totalFiles}</p>
      </div>

      <div className="card">
        <p className="text-small text-text-secondary mb-1">Storage Used</p>
        <p className="text-display text-3xl font-bold">
          {kb?.storageUsed ? `${Math.round(kb.storageUsed / 1024 / 1024)}MB` : '0MB'}
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
