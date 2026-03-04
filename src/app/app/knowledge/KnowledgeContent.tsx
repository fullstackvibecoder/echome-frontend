'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
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
import { UnifiedContentItem } from '@/types';
import { parseMboxFile } from '@/lib/mbox-parser';
import { isMboxFile } from '@/lib/file-utils';
import { MboxProgressUI } from '@/components/mbox-progress-ui';
import { CONTENT_SOURCE_CONFIG, ContentSourceType } from '@/types';
import { InfoTooltip } from '@/components/info-tooltip';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

// ============================================
// HELPERS
// ============================================

function getVoiceStrength(chunks: number): { level: string; color: string; percent: number } {
  if (chunks >= 5000) return { level: 'Excellent', color: 'text-emerald-500', percent: 100 };
  if (chunks >= 2000) return { level: 'Strong', color: 'text-emerald-500', percent: 85 };
  if (chunks >= 500) return { level: 'Good', color: 'text-accent', percent: 60 };
  if (chunks >= 100) return { level: 'Building', color: 'text-amber-500', percent: 35 };
  return { level: 'Getting started', color: 'text-text-secondary', percent: 10 };
}

function getSourceIcon(sourceType: ContentSourceType): string {
  const icons: Record<ContentSourceType, string> = {
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
  return icons[sourceType] || '📄';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// KB LIST ITEM COMPONENT
// ============================================

interface KBListItemProps {
  item: UnifiedContentItem;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function KBListItem({ item, selectionMode, isSelected, onSelect, onDelete }: KBListItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer
        ${isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-secondary border border-transparent'}
      `}
      onClick={selectionMode ? onSelect : undefined}
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

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-text-secondary truncate">{item.description}</p>
        )}
      </div>

      {/* Knowledge Nuggets */}
      <div className="flex-shrink-0 text-xs text-text-secondary">
        {item.chunkCount || 0} knowledge nuggets
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-xs text-text-tertiary w-16 text-right">
        {formatDate(item.createdAt)}
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
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function KnowledgeContent() {
  const { voices, isTeamsUser, activeVoice } = useVoiceContext();
  const {
    kbs,
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
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

  // Derived state
  const hasContent = contentItems.length > 0;
  const totalChunks = contentStats?.totalChunks || 0;
  const totalItems = contentStats?.totalItems || 0;
  const voiceStrength = getVoiceStrength(totalChunks);

  // Filter and group content
  const filteredContent = contentItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by source type
  const groupedByType = filteredContent.reduce((acc, item) => {
    const type = item.sourceType as ContentSourceType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<ContentSourceType, typeof filteredContent>);

  // Selection helpers
  const selectedCount = selectedIds.size;
  const allSelected = filteredContent.length > 0 && selectedIds.size === filteredContent.length;

  const handleSelectItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContent.map((item) => item.id)));
    }
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

      const totalBatches = Math.ceil(parseResult.emails.length / 50);
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
        <div className="py-8 space-y-6 animate-fade-in">
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

          {/* Header with Guidance */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              Your Echosystem
              <InfoTooltip text="Your Knowledge Base is your voice DNA. Everything you add here teaches EchoMe how YOU write and speak. The more you add, the more authentic your generated content sounds." />
            </h1>
            <p className="text-text-secondary text-sm max-w-2xl">
              This is where Echo learns <span className="text-text-primary font-medium">your</span> voice.
              The more you add, the better Echo writes like you.
            </p>

            {/* Quick Help */}
            <div className="relative group mt-4">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur" />
              <div className="relative p-4 bg-card border border-border rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium mb-1">
                      What should I add?
                    </p>
                    <p className="text-sm text-text-secondary">
                      Anything <span className="font-medium">you&apos;ve written</span> — emails, social posts, blog articles, scripts.
                      Echo analyzes your word choices, tone, and style to generate content that sounds like you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

          {/* Add Content Section */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">
              Add to your Echosystem
            </p>
            <div className="flex flex-wrap gap-2 stagger-children">
              <button
                onClick={() => setShowVoiceModal(true)}
                className="group flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all text-sm font-medium"
                title="Record yourself talking — we'll transcribe it"
              >
                <span>🎤</span> Voice
              </button>
              <button
                onClick={() => setShowSocialModal(true)}
                className="group flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all text-sm font-medium"
                title="Import from YouTube or Instagram"
              >
                <span>📱</span> Social
              </button>
              <button
                onClick={() => setShowBlogModal(true)}
                className="group flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all text-sm font-medium"
                title="Import articles from your blog"
              >
                <span>📝</span> Blog
              </button>
              <button
                onClick={() => setShowMboxInstructions(true)}
                disabled={mboxUploading}
                className="group flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all text-sm font-medium disabled:opacity-50"
                title="Import emails you've sent"
              >
                <span>📧</span> Email
              </button>
              <button
                onClick={() => setShowPasteModal(true)}
                className="group flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all text-sm font-medium"
                title="Copy & paste any text you've written"
              >
                <span>✍️</span> Paste
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center gap-2"
                title="Upload documents (PDF, Word, TXT)"
              >
                <span>📤</span> Upload
              </button>
              <InfoTooltip text="Upload blog posts, articles, PDFs, docs, or email exports. EchoMe analyzes your writing patterns to match your unique voice." />
            </div>
          </div>

          {/* Voice Strength Indicator */}
          {hasContent && (
            <div className="relative group mb-6">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur" />
              <div className="relative p-5 bg-card border border-border rounded-xl card-lift">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Echo Training Progress
                        <InfoTooltip text="This measures how well EchoMe knows your voice. Add more of your content to improve it. 'Strong' or higher = your generated content will closely match your writing style." />
                      </p>
                      <p className="text-xs text-text-secondary">
                        {totalItems} source{totalItems !== 1 ? 's' : ''} added • <span className="font-semibold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">{totalChunks.toLocaleString()}</span> knowledge nuggets learned
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className={`text-sm font-semibold ${voiceStrength.color}`}>{voiceStrength.level}</span>
                    <button
                      onClick={refresh}
                      disabled={loading}
                      className="text-text-secondary hover:text-primary transition-colors text-sm"
                    >
                      ↻
                    </button>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-bg-tertiary rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-accent-purple h-2.5 rounded-full transition-all duration-500 shadow-md shadow-primary/25"
                    style={{ width: `${voiceStrength.percent}%` }}
                  />
                </div>
                {totalChunks < 500 && (
                  <p className="text-xs text-text-secondary mt-2">
                    Keep adding content to improve voice accuracy. Aim for 500+ knowledge nuggets.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasContent && (
            <div className="text-center py-10 px-6 bg-bg-secondary rounded-xl border border-border">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-lg font-semibold mb-2">Your Echosystem is empty</h3>
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

          {/* Content List */}
          {hasContent && (
            <div className="space-y-4">
              {/* Section Header */}
              <p className="text-xs uppercase tracking-wider text-text-secondary font-medium">
                Your Content Library
              </p>

              {/* Search & Bulk Actions */}
              <div className="flex items-center gap-3">
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
                      All ({filteredContent.length})
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

              {/* Grouped List */}
              {Object.entries(groupedByType).map(([type, items]) => {
                const config = CONTENT_SOURCE_CONFIG[type as ContentSourceType];
                const icon = getSourceIcon(type as ContentSourceType);
                const totalChunksInGroup = items.reduce((sum, item) => sum + (item.chunkCount || 0), 0);

                return (
                  <div key={type} className="space-y-1">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                      <span>{icon}</span>
                      <span className="font-medium text-text-primary">{config?.label || type}</span>
                      <span className="text-text-secondary">({items.length})</span>
                      <span className="text-text-tertiary">•</span>
                      <span className="text-text-secondary text-xs">{totalChunksInGroup.toLocaleString()} knowledge nuggets</span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {items.map((item) => (
                        <KBListItem
                          key={item.id}
                          item={item}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(item.id)}
                          onSelect={() => handleSelectItem(item.id)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* No Results */}
              {filteredContent.length === 0 && searchTerm && (
                <div className="text-center py-8 text-text-secondary">
                  No results for &ldquo;{searchTerm}&rdquo;
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* MODALS */}
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
