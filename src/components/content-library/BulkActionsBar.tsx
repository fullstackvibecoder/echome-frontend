'use client';

/**
 * BulkActionsBar Component
 *
 * Action bar that appears when items are selected.
 * Provides select all, clear, delete, download, and export actions.
 */

import { useState } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => Promise<void>;
  onDownload: () => Promise<void>;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onDownload,
}: BulkActionsBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-accent/10 border border-accent/20 rounded-lg">
      {/* Left: Selection Info */}
      <div className="flex items-center gap-4">
        <span className="font-medium text-text-primary">
          {selectedCount} selected
        </span>

        <div className="flex items-center gap-2">
          {!allSelected && (
            <button
              onClick={onSelectAll}
              className="text-sm text-accent hover:text-accent/80 hover:underline transition-colors"
            >
              Select all {totalCount}
            </button>
          )}
          <button
            onClick={onClearSelection}
            className="text-sm text-text-secondary hover:text-text-primary hover:underline transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Download */}
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-bg-secondary border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Download</span>
        </button>

        {/* Delete */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Delete {selectedCount} items?</span>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 text-sm font-medium text-white bg-error rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Confirm'
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-error bg-error/10 border border-error/20 rounded-lg hover:bg-error/20 transition-colors"
          >
            <TrashIcon />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default BulkActionsBar;
