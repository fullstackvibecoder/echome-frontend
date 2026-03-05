'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useVoiceContext } from '@/contexts/voice-context';
import { UploadZone } from '@/components/upload-zone';
import { FileList } from '@/components/file-list';
import { PasteContentModal } from '@/components/paste-content-modal';
import { VoiceRecorder } from '@/components/voice-recorder';
import { SocialImportModal } from '@/components/social-import-modal';
import { BlogImportModal } from '@/components/blog-import-modal';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { UnifiedContentItem, ContentSourceType, CONTENT_SOURCE_CONFIG } from '@/types';
import { parseMboxFile } from '@/lib/mbox-parser';
import { isMboxFile } from '@/lib/file-utils';
import { MboxProgressUI } from '@/components/mbox-progress-ui';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { VoiceIntelligenceDashboard } from './components/VoiceIntelligenceDashboard';
import { AddContentSection } from './components/AddContentSection';
import { KBSourceFilterChips } from './components/KBSourceFilterChips';
import { KBContentCard } from './components/KBContentCard';

// ============================================
// HELPERS
// ============================================

const SOURCE_ICONS: Record<string, string> = {
  file_upload: '📄',
  paste_text: '✍️',
  paste_social: '📱',
  paste_email: '📧',
  voice_recording: '🎤',
  mbox_import: '📥',
  youtube_import: '🎬',
  instagram_import: '📸',
  blog_import: '🌐',
  generation: '✨',
  'clip-finder': '🎥',
};

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
  if (status === 'processing' || status === 'uploading') {
    return <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />;
  }
  if (status === 'failed') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />;
}

function getStoredViewMode(): 'list' | 'grid' {
  if (typeof window === 'undefined') return 'list';
  return (localStorage.getItem('echome_kb_view_mode') as 'list' | 'grid') || 'list';
}

// ============================================
// KB LIST ITEM COMPONENT (enhanced)
// ============================================

interface KBListItemProps {
  item: UnifiedContentItem;
  isExpanded: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
}

function KBListItem({ item, isExpanded, selectionMode, isSelected, onSelect, onToggleExpand, onDelete }: KBListItemProps) {
  const [hovered, setHovered] = useState(false);
  const config = CONTENT_SOURCE_CONFIG[item.sourceType as ContentSourceType];
  const icon = SOURCE_ICONS[item.sourceType] || '📄';

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer
          ${isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-secondary border border-transparent'}
        `}
        onClick={selectionMode ? onSelect : onToggleExpand}
      >
        {/* Checkbox */}
        {(selectionMode || hovered) && (
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer
              ${isSelected ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}
            `}
          >
            {isSelected && <span className="text-xs">✓</span>}
          </div>
        )}

        {/* Source icon */}
        <span className="text-base flex-shrink-0" title={config?.label || item.sourceType}>{icon}</span>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
          {item.description && (
            <p className="text-xs text-text-secondary truncate">{item.description}</p>
          )}
        </div>

        {/* Status + nuggets */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot status={item.status} />
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {item.chunkCount || 0} nuggets
          </span>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-xs text-text-tertiary w-16 text-right hidden sm:block">
          {formatRelativeDate(item.createdAt)}
        </div>

        {/* Delete */}
        {hovered && !selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-shrink-0 p-1 text-text-tertiary hover:text-error transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="ml-11 mr-3 mb-2 p-3 bg-bg-secondary rounded-lg border border-border space-y-2">
          {item.description && (
            <p className="text-xs text-text-secondary">{item.description}</p>
          )}
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
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-error hover:text-error/80 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function KnowledgeContent() {
  const { voices, isTeamsUser, activeVoice } = useVoiceContext();
  const {
    contentItems,
    contentStats,
    loading,
    selectedKb,
    selectKb,
    deleteContent,
    refresh,
  } = useKnowledgeBase(isTeamsUser ? activeVoice?.knowledgeBaseId : undefined);
  const { files: uploadFiles, uploading, addFiles, removeFile, uploadFiles: doUpload, totalSize } = useFileUpload();

  // When active voice changes, switch to that voice's KB
  useEffect(() => {
    if (isTeamsUser && activeVoice?.knowledgeBaseId && activeVoice.knowledgeBaseId !== selectedKb) {
      selectKb(activeVoice.knowledgeBaseId);
    }
  }, [isTeamsUser, activeVoice?.knowledgeBaseId, selectKb, selectedKb]);

  // Voices linked to the currently selected KB
  const linkedVoices = useMemo(() => {
    if (!isTeamsUser || !selectedKb) return [];
    return voices.filter(v => v.knowledgeBaseId === selectedKb);
  }, [voices, isTeamsUser, selectedKb]);

  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showMboxInstructions, setShowMboxInstructions] = useState(false);
  const [mboxUploading, setMboxUploading] = useState(false);
  const [mboxProgress, setMboxProgress] = useState(0);
  const [mboxStatus, setMboxStatus] = useState<string>('');
  const [mboxResult, setMboxResult] = useState<{
    emailsIngested: number;
    chunksCreated: number;
  } | null>(null);
  const mboxInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [listExpanded, setListExpanded] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

  // Load persisted view mode
  useEffect(() => {
    setViewMode(getStoredViewMode());
  }, []);

  // Derived state
  const hasContent = contentItems.length > 0;
  const totalChunks = contentStats?.totalChunks || 0;
  const totalItems = contentStats?.totalItems || 0;
  const bySourceType = contentStats?.bySourceType || {};

  // Available filter types (only types with items)
  const availableFilters = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    contentItems.forEach(item => {
      typeCounts[item.sourceType] = (typeCounts[item.sourceType] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as ContentSourceType, count }))
      .sort((a, b) => b.count - a.count);
  }, [contentItems]);

  // Display content: filtered + searched + sorted
  const displayContent = useMemo(() => {
    let items = [...contentItems];

    // Source filter
    if (sourceFilter !== 'all') {
      items = items.filter(item => item.sourceType === sourceFilter);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'recent' ? dateB - dateA : dateA - dateB;
    });

    return items;
  }, [contentItems, sourceFilter, searchTerm, sortBy]);

  // Selection helpers
  const selectedCount = selectedIds.size;
  const allSelected = displayContent.length > 0 && selectedIds.size === displayContent.length;

  const handleSelectItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
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
        await Promise.all(Array.from(selectedIds).map(id => deleteContent(id).catch(() => {})));
        setSelectedIds(new Set());
        setSelectionMode(false);
      } finally {
        setBulkDeleting(false);
      }
    } else if (deleteConfirm.id) {
      await deleteContent(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      const next = prev === 'list' ? 'grid' : 'list';
      localStorage.setItem('echome_kb_view_mode', next);
      return next;
    });
  }, []);

  // Modal opener (used by child components)
  const handleOpenModal = useCallback((modal: string) => {
    switch (modal) {
      case 'voice': setShowVoiceModal(true); break;
      case 'social': setShowSocialModal(true); break;
      case 'blog': setShowBlogModal(true); break;
      case 'email': setShowMboxInstructions(true); break;
      case 'paste': setShowPasteModal(true); break;
      case 'upload': setShowUploadModal(true); break;
    }
  }, []);

  // File upload handlers
  const handleUpload = async () => {
    if (!selectedKb) return;
    const mboxFiles = uploadFiles.filter(f => f.status === 'pending' && isMboxFile(f.file));
    const otherFiles = uploadFiles.filter(f => f.status === 'pending' && !isMboxFile(f.file));

    if (mboxFiles.length > 0) {
      setShowUploadModal(false);
      for (const fileWithProgress of mboxFiles) {
        await processMboxFile(fileWithProgress.file);
      }
    }

    if (otherFiles.length > 0) {
      await doUpload(selectedKb);
      setShowUploadModal(false);
    } else if (mboxFiles.length === 0) {
      setShowUploadModal(false);
    }

    await refresh();
  };

  const processMboxFile = async (file: File) => {
    setMboxUploading(true);
    setMboxProgress(0);
    setMboxStatus('Reading file...');
    setMboxResult(null);

    try {
      const parseResult = await parseMboxFile(file, {
        maxEmails: 100,
        minContentLength: 50,
        onProgress: ({ percent, emailsFound, status }) => {
          setMboxProgress(Math.round(percent * 0.7));
          setMboxStatus(status || `Found ${emailsFound} emails...`);
        },
      });

      if (parseResult.emails.length === 0) {
        toast.info('No emails found to import. Make sure you\'re uploading your "Sent" folder.');
        return;
      }

      setMboxProgress(70);
      setMboxStatus(`Uploading ${parseResult.emails.length} emails...`);

      const result = await api.kbContent.ingestParsedEmails({
        emails: parseResult.emails,
        knowledgeBaseId: selectedKb ?? undefined,
        fileName: file.name,
        parseStats: {
          totalEmailsFound: parseResult.totalEmailsFound,
          emailsParsed: parseResult.emailsParsed,
          emailsFiltered: parseResult.emailsFiltered,
          parseErrors: parseResult.parseErrors,
        },
        onBatchProgress: (batchNum, totalBatches) => {
          setMboxProgress(70 + Math.round((batchNum / totalBatches) * 30));
          setMboxStatus(`Uploading batch ${batchNum}/${totalBatches}...`);
        },
      });

      setMboxProgress(100);
      setMboxResult({ emailsIngested: result.emailsIngested, chunksCreated: result.chunksCreated });
      await refresh();
    } catch (err) {
      toast.error(`Failed to import emails: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
    }
  };

  const handleMboxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowMboxInstructions(false);
    await processMboxFile(file);
    if (mboxInputRef.current) mboxInputRef.current.value = '';
  };

  // Hidden file input
  const mboxInput = (
    <input
      ref={mboxInputRef}
      type="file"
      accept=".mbox,application/mbox,application/octet-stream,text/plain"
      onChange={handleMboxUpload}
      className="hidden"
    />
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
      {mboxInput}

      {/* Loading */}
      {loading && (
        <div className="py-8 space-y-6 animate-fade-in stagger-children">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-10 w-24 rounded-xl" />
            <div className="skeleton h-10 w-24 rounded-xl" />
            <div className="skeleton h-10 w-24 rounded-xl" />
            <div className="skeleton h-10 w-24 rounded-xl" />
          </div>
          <div className="skeleton h-24 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
        </div>
      )}

      {/* MBOX Progress */}
      {mboxUploading && <MboxProgressUI progress={mboxProgress} status={mboxStatus} />}

      {/* MBOX Success */}
      {mboxResult && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              {mboxResult.emailsIngested} emails imported
            </span>
          </div>
          <button onClick={() => setMboxResult(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {!loading && (
        <>
          <UpgradeBanner />

          {/* Voice has no KB (EchoTeams) */}
          {isTeamsUser && activeVoice && !activeVoice.knowledgeBaseId && (
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm">
              <span>&#9888;&#65039;</span>
              <span className="text-text-secondary">
                <strong>{activeVoice.name}</strong> has no Knowledge Base yet.
                <a href="/app/team-voices" className="text-primary hover:underline ml-1">Assign or create one</a> in Team Voices, or add content here to use the shared KB below.
              </span>
            </div>
          )}

          {/* Voice Linking Info (EchoTeams) */}
          {isTeamsUser && linkedVoices.length > 0 && (
            <div className="mb-6 p-3 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-2 text-sm">
              <span className="text-accent">🎙️</span>
              <span className="text-text-secondary">
                Used by: {linkedVoices.map(v => (
                  <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full text-xs font-medium text-accent mx-0.5">
                    {v.name}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* ZONE 1 — Voice Intelligence Dashboard */}
          <VoiceIntelligenceDashboard
            contentStats={contentStats || { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} }}
            totalItems={totalItems}
            totalChunks={totalChunks}
            loading={loading}
            onRefresh={refresh}
            onOpenModal={handleOpenModal}
          />

          {/* ZONE 2 — Smart Add Content */}
          <AddContentSection
            bySourceType={bySourceType}
            mboxUploading={mboxUploading}
            onOpenModal={handleOpenModal}
          />

          {/* Empty State */}
          {!hasContent && (
            <div className="text-center py-10 px-6 bg-bg-secondary rounded-xl border border-border">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-lg font-semibold mb-2">Your Knowledge Base is empty</h3>
              <p className="text-text-secondary text-sm max-w-md mx-auto mb-4">
                Start by adding something you&apos;ve written. Try pasting an email or importing your YouTube videos — it only takes a minute!
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="px-4 py-2 border border-accent text-accent rounded-lg hover:bg-accent/5 text-sm font-medium"
                >
                  Paste Text
                </button>
                <button
                  onClick={() => setShowSocialModal(true)}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 text-sm font-medium"
                >
                  Import YouTube
                </button>
              </div>
            </div>
          )}

          {/* ZONE 3 — Content Library */}
          {hasContent && (
            <div className="space-y-4">
              {/* Filter Chips */}
              <KBSourceFilterChips
                availableTypes={availableFilters}
                activeFilter={sourceFilter}
                onFilterChange={setSourceFilter}
                totalCount={contentItems.length}
              />

              {/* Controls Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg input-glow"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">🔍</span>
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest')}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary"
                >
                  <option value="recent">Recent</option>
                  <option value="oldest">Oldest</option>
                </select>

                {/* View toggle */}
                <button
                  onClick={toggleViewMode}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:border-accent transition-colors"
                  title={viewMode === 'list' ? 'Switch to grid' : 'Switch to list'}
                >
                  {viewMode === 'list' ? '▦' : '☰'}
                </button>

                {/* Select mode */}
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
                      disabled={selectedCount === 0 || bulkDeleting}
                      className="px-3 py-1.5 text-sm bg-error/10 text-error rounded-lg hover:bg-error/20 disabled:opacity-50"
                    >
                      {bulkDeleting ? '...' : `Delete (${selectedCount})`}
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

              {/* Content Items */}
              {(() => {
                const visibleItems = listExpanded || searchTerm || sourceFilter !== 'all'
                  ? displayContent
                  : displayContent.slice(0, 5);
                const hiddenCount = displayContent.length - visibleItems.length;

                return viewMode === 'list' ? (
                  <>
                    <div className="space-y-1">
                      {visibleItems.map((item) => (
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
                    {displayContent.length > 5 && !searchTerm && sourceFilter === 'all' && (
                      <button
                        onClick={() => setListExpanded(!listExpanded)}
                        className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        {listExpanded ? 'Show less' : `Show all (${displayContent.length})`}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visibleItems.map((item) => (
                        <KBContentCard
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
                    {displayContent.length > 5 && !searchTerm && sourceFilter === 'all' && (
                      <button
                        onClick={() => setListExpanded(!listExpanded)}
                        className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        {listExpanded ? 'Show less' : `Show all (${displayContent.length})`}
                      </button>
                    )}
                  </>
                );
              })()}

              {/* No Results */}
              {displayContent.length === 0 && (searchTerm || sourceFilter !== 'all') && (
                <div className="text-center py-8 text-text-secondary">
                  {searchTerm
                    ? <>No results for &ldquo;{searchTerm}&rdquo;</>
                    : 'No items for this filter'
                  }
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* MODALS (all unchanged) */}
      {/* ============================================ */}

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowUploadModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upload Files</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <UploadZone onFilesAdded={addFiles} disabled={uploading} />
              <FileList files={uploadFiles} onRemove={removeFile} totalSize={totalSize} />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:border-accent">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0} className="flex-1 btn-primary py-2 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MBOX Modal */}
      {showMboxInstructions && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowMboxInstructions(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Import Emails</h2>
                <button onClick={() => setShowMboxInstructions(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Import your sent emails to train Echo on your writing style.
              </p>
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-bg-secondary rounded-lg text-xs">
                  <p className="font-medium mb-1">📧 Gmail</p>
                  <p className="text-text-secondary">Go to takeout.google.com → Export Mail → Sent folder</p>
                </div>
                <div className="p-3 bg-bg-secondary rounded-lg text-xs">
                  <p className="font-medium mb-1">🍎 Apple Mail</p>
                  <p className="text-text-secondary">Mailbox → Export Mailbox → Upload .mbox file</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMboxInstructions(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
                <button onClick={() => mboxInputRef.current?.click()} className="flex-1 btn-primary py-2 text-sm">Select File</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Paste Modal */}
      <PasteContentModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onSuccess={refresh}
        knowledgeBaseId={selectedKb ?? undefined}
      />

      {/* Voice Modal */}
      {showVoiceModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowVoiceModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold">Record Voice</h2>
                <button onClick={() => setShowVoiceModal(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                <VoiceRecorder onSaved={() => { setShowVoiceModal(false); refresh(); }} knowledgeBaseId={selectedKb ?? undefined} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Social Modal */}
      <SocialImportModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        onImportComplete={refresh}
        knowledgeBaseId={selectedKb ?? undefined}
      />

      {/* Blog Modal */}
      <BlogImportModal
        isOpen={showBlogModal}
        onClose={() => setShowBlogModal(false)}
        onImportComplete={refresh}
        knowledgeBaseId={selectedKb ?? undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title={deleteConfirm?.type === 'bulk' ? 'Delete Items' : 'Delete Content'}
        message={
          deleteConfirm?.type === 'bulk'
            ? `Delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`
            : 'Delete this content? This cannot be undone.'
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
