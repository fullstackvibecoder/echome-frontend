'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedContentItem, ContentSourceType, KBContentStats, CONTENT_SOURCE_CONFIG } from '@/types';
import { VoiceIntelligenceDashboard } from './VoiceIntelligenceDashboard';
import { SourceCategoryCards } from './SourceCategoryCards';
import { KBSourceFilterChips } from './KBSourceFilterChips';
import { KBContentCard } from './KBContentCard';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

// ============================================
// HELPERS (moved from KnowledgeContent)
// ============================================

import type { LucideIcon } from 'lucide-react';
import { Upload, PenLine, MessageSquare, Mail, Mic, Play, Camera, FileText, Sparkles, Video } from 'lucide-react';

const SOURCE_ICON_MAP: Record<string, LucideIcon> = {
  file_upload: Upload,
  paste_text: PenLine,
  paste_social: MessageSquare,
  paste_email: Mail,
  voice_recording: Mic,
  mbox_import: Mail,
  youtube_import: Play,
  instagram_import: Camera,
  blog_import: FileText,
  generation: Sparkles,
  'clip-finder': Video,
};

function SourceIcon({ type, className }: { type: string; className?: string }) {
  const Icon = SOURCE_ICON_MAP[type] || FileText;
  return <Icon className={className || 'w-4 h-4'} />;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusDot({ status }: { status: string }) {
  if (status === 'completed') return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
  if (status === 'processing' || status === 'uploading') return <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />;
  if (status === 'failed') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />;
}

// ============================================
// LIST ITEM
// ============================================

interface KBListItemProps {
  item: UnifiedContentItem;
  isExpanded: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
}

function KBListItem({ item, isExpanded, selectionMode, isSelected, onSelect, onToggleExpand, onDelete }: KBListItemProps) {
  const [hovered, setHovered] = useState(false);
  const config = CONTENT_SOURCE_CONFIG[item.sourceType as ContentSourceType];

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
          isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-secondary border border-transparent'
        }`}
        onClick={selectionMode ? onSelect : onToggleExpand}
      >
        {(selectionMode || hovered) && (
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${
              isSelected ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'
            }`}
          >
            {isSelected && <span className="text-xs">✓</span>}
          </div>
        )}
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-bg-secondary flex items-center justify-center" title={config?.label || item.sourceType}>
          <SourceIcon type={item.sourceType} className="w-3.5 h-3.5 text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
          {item.description && <p className="text-xs text-text-secondary truncate">{item.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot status={item.status} />
          <span className="text-xs text-text-secondary whitespace-nowrap">{item.chunkCount || 0} patterns</span>
        </div>
        <div className="flex-shrink-0 text-xs text-text-tertiary w-16 text-right hidden sm:block">
          {formatRelativeDate(item.createdAt)}
        </div>
        {hovered && !selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-shrink-0 p-1 text-text-tertiary hover:text-error transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="ml-11 mr-3 mb-2 p-3 bg-bg-secondary rounded-lg border border-border space-y-2">
          {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary">
            <span>Type: {config?.label || item.sourceType}</span>
            {item.fileType && <span>File: {item.fileType}</span>}
            {item.fileSize ? <span>Size: {(item.fileSize / 1024).toFixed(0)} KB</span> : null}
            <span>Added: {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          {item.status === 'failed' && item.errorMessage && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{item.errorMessage}</p>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-error hover:text-error/80 transition-colors">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// SOURCES DRAWER
// ============================================

interface SourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contentStats: KBContentStats | null;
  totalChunks: number;
  contentItems: UnifiedContentItem[];
  bySourceType: Record<string, number>;
  mboxUploading: boolean;
  onOpenModal: (modal: string) => void;
  onDeleteContent: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export function SourcesDrawer({
  isOpen,
  onClose,
  contentStats,
  totalChunks,
  contentItems,
  bySourceType,
  mboxUploading,
  onOpenModal,
  onDeleteContent,
  onRefresh,
  loading,
}: SourcesDrawerProps) {
  // Library state (local to drawer)
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSourceFilter('all');
      setSelectionMode(false);
      setSelectedIds(new Set());
      setExpandedItemId(null);
    }
  }, [isOpen]);

  // Derived state
  const hasContent = contentItems.length > 0;

  const availableFilters = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    contentItems.forEach(item => {
      typeCounts[item.sourceType] = (typeCounts[item.sourceType] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as ContentSourceType, count }))
      .sort((a, b) => b.count - a.count);
  }, [contentItems]);

  const displayContent = useMemo(() => {
    let items = [...contentItems];
    if (sourceFilter !== 'all') items = items.filter(item => item.sourceType === sourceFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => item.title.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term));
    }
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'recent' ? dateB - dateA : dateA - dateB;
    });
    return items;
  }, [contentItems, sourceFilter, searchTerm, sortBy]);

  const allSelected = displayContent.length > 0 && selectedIds.size === displayContent.length;

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayContent.map(item => item.id)));
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ type: 'bulk' });
  };

  const handleDelete = (contentId: string) => {
    setDeleteConfirm({ type: 'single', id: contentId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'bulk') {
      setBulkDeleting(true);
      try {
        const results = await Promise.allSettled(Array.from(selectedIds).map(id => onDeleteContent(id)));
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          toast.error(`Failed to delete ${failures.length} item${failures.length > 1 ? 's' : ''}. Please try again.`);
        }
        setSelectedIds(new Set());
        setSelectionMode(false);
      } finally {
        setBulkDeleting(false);
      }
    } else if (deleteConfirm.id) {
      await onDeleteContent(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleFilterByCategory = useCallback((sourceType: string) => {
    setSourceFilter(sourceType);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-bold text-text-primary">Sources</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Voice Intelligence */}
            <VoiceIntelligenceDashboard
              contentStats={contentStats || { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} }}
              totalChunks={totalChunks}
            />

            {/* Source Category Cards */}
            <SourceCategoryCards
              bySourceType={bySourceType}
              contentItems={contentItems}
              mboxUploading={mboxUploading}
              onOpenModal={onOpenModal}
              onFilterByCategory={handleFilterByCategory}
            />

            {/* Content Library */}
            {hasContent && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Content Library <span className="text-text-tertiary font-normal">({contentItems.length})</span>
                </h3>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search content..."
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-xl input-glow"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                </div>

                {/* Filters */}
                <KBSourceFilterChips
                  availableTypes={availableFilters}
                  activeFilter={sourceFilter}
                  onFilterChange={setSourceFilter}
                  totalCount={contentItems.length}
                />

                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest')}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary"
                  >
                    <option value="recent">Recent</option>
                    <option value="oldest">Oldest</option>
                  </select>
                  {!selectionMode ? (
                    <button
                      onClick={() => setSelectionMode(true)}
                      className="px-3 py-2 text-sm border border-border rounded-lg hover:border-accent transition-colors"
                    >
                      Select
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-accent text-accent focus:ring-accent"
                        />
                        All ({displayContent.length})
                      </label>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0 || bulkDeleting}
                        className="px-3 py-1.5 text-sm bg-error/10 text-error rounded-lg hover:bg-error/20 disabled:opacity-50"
                      >
                        {bulkDeleting ? '...' : `Delete (${selectedIds.size})`}
                      </button>
                      <button
                        onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                        className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Items (list only in drawer — no grid toggle) */}
                <div className="space-y-1">
                  {(listExpanded || searchTerm || sourceFilter !== 'all'
                    ? displayContent
                    : displayContent.slice(0, 10)
                  ).map((item) => (
                    <KBListItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedItemId === item.id}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.has(item.id)}
                      onSelect={() => handleSelectItem(item.id)}
                      onToggleExpand={() => setExpandedItemId(prev => prev === item.id ? null : item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>

                {displayContent.length > 10 && !searchTerm && sourceFilter === 'all' && (
                  <button
                    onClick={() => setListExpanded(!listExpanded)}
                    className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    {listExpanded ? 'Show less' : `Show all (${displayContent.length})`}
                  </button>
                )}

                {displayContent.length === 0 && (searchTerm || sourceFilter !== 'all') && (
                  <div className="text-center py-6 text-text-secondary text-sm">
                    {searchTerm ? <>No results for &ldquo;{searchTerm}&rdquo;</> : 'No items for this filter'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={deleteConfirm?.type === 'bulk' ? `Delete ${selectedIds.size} items?` : 'Delete content?'}
        message="This will permanently remove the content and its voice patterns."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
