'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { X, Mic, Settings, Plus } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useVoiceContext } from '@/contexts/voice-context';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { UploadZone } from '@/components/upload-zone';
import { FileList } from '@/components/file-list';
import { PasteContentModal } from '@/components/paste-content-modal';
import { VoiceRecorder } from '@/components/voice-recorder';
import { SocialImportModal } from '@/components/social-import-modal';
import { BlogImportModal } from '@/components/blog-import-modal';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { parseMboxFile } from '@/lib/mbox-parser';
import { isMboxFile } from '@/lib/file-utils';
import { MboxProgressUI } from '@/components/mbox-progress-ui';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { VoiceWaveform } from '@/components/voice-waveform';
import { AskYourVoice } from './components/AskYourVoice';
import { SourcesDrawer } from './components/SourcesDrawer';

// Lucide icons for tier badges
import { Sprout, TrendingUp, Zap, Star, type LucideIcon } from 'lucide-react';

// ============================================
// HELPERS
// ============================================

const TIERS: Array<{ name: string; min: number; icon: LucideIcon; badgeBg: string; badgeText: string }> = [
  { name: 'Seed', min: 0, icon: Sprout, badgeBg: 'bg-gray-100 dark:bg-gray-800', badgeText: 'text-gray-700 dark:text-gray-300' },
  { name: 'Growing', min: 26, icon: TrendingUp, badgeBg: 'bg-amber-50 dark:bg-amber-900/30', badgeText: 'text-amber-700 dark:text-amber-400' },
  { name: 'Strong', min: 51, icon: Zap, badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-400' },
  { name: 'Signature', min: 76, icon: Star, badgeBg: 'bg-violet-50 dark:bg-violet-900/30', badgeText: 'text-violet-700 dark:text-violet-400' },
];

function getStrengthTier(strength: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (strength >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function buildContentSummary(bySourceType: Record<string, number>): string {
  const labels: Record<string, string> = {
    voice_recording: 'voice',
    youtube_import: 'YouTube',
    instagram_import: 'Instagram',
    blog_import: 'blog',
    mbox_import: 'email',
    paste_text: 'writing',
    paste_social: 'social',
    paste_email: 'email',
    file_upload: 'files',
  };
  const activeTypes = Object.entries(bySourceType)
    .filter(([, count]) => count > 0)
    .map(([type]) => labels[type] || type)
    .filter((v, i, a) => a.indexOf(v) === i);
  const total = Object.values(bySourceType).reduce((a, b) => a + b, 0);
  if (total === 0) return '';
  return `Trained on ${total} source${total !== 1 ? 's' : ''} across ${activeTypes.join(', ')}`;
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
  const { data: voiceStrength } = useVoiceStrength();

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

  // Sources drawer state
  const [showSources, setShowSources] = useState(false);

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
  const [mboxResult, setMboxResult] = useState<{ emailsIngested: number; chunksCreated: number } | null>(null);
  const mboxInputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const hasContent = contentItems.length > 0;
  const totalChunks = contentStats?.totalChunks || 0;
  const totalItems = contentStats?.totalItems || 0;
  const bySourceType = contentStats?.bySourceType || {};

  // Modal opener
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

  // Voice strength tier for header
  const tier = voiceStrength ? getStrengthTier(voiceStrength.overallStrength) : null;
  const TierIcon = tier?.icon;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {mboxInput}

      {/* ─── Compact Header ─── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight">Build Your Voice</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {tier && TierIcon && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.badgeBg} ${tier.badgeText}`}>
                  <TierIcon className="w-3 h-3" />
                  {tier.name}
                </span>
              )}
              {voiceStrength && (
                <span className="text-xs text-text-secondary">
                  {voiceStrength.overallStrength}<span className="text-text-tertiary">/100</span>
                </span>
              )}
              {hasContent && (
                <span className="text-xs text-text-tertiary">
                  · {totalItems} source{totalItems !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {/* Mini waveform */}
          {voiceStrength && voiceStrength.waveformData.length > 0 && (
            <div className="hidden sm:block" style={{ width: 120, height: 28 }}>
              <VoiceWaveform
                waveformData={voiceStrength.waveformData}
                overallStrength={voiceStrength.overallStrength}
                className="h-7"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSources(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sources</span>
          </button>
          <button
            onClick={() => handleOpenModal('paste')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* ─── Banners ─── */}
      {!loading && (
        <div className="flex-shrink-0 px-4 sm:px-6">
          <UpgradeBanner />

          {/* Teams: voice has no KB */}
          {isTeamsUser && activeVoice && !activeVoice.knowledgeBaseId && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm">
              <span>&#9888;&#65039;</span>
              <span className="text-text-secondary">
                <strong>{activeVoice.name}</strong> has no Knowledge Base yet.
                <a href="/app/team-voices" className="text-primary hover:underline ml-1">Assign or create one</a>.
              </span>
            </div>
          )}

          {/* Teams: linked voices */}
          {isTeamsUser && linkedVoices.length > 0 && (
            <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-text-secondary">
                Used by: {linkedVoices.map(v => (
                  <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full text-xs font-medium text-accent mx-0.5">
                    {v.name}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* Mbox progress */}
          {mboxUploading && <div className="mt-3"><MboxProgressUI progress={mboxProgress} status={mboxStatus} /></div>}

          {/* Mbox success */}
          {mboxResult && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  {mboxResult.emailsIngested} emails imported
                </span>
              </div>
              <button onClick={() => setMboxResult(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ─── Chat (fills remaining space) ─── */}
      {!loading && (
        <div className="flex-1 min-h-0">
          <AskYourVoice
            disabled={!hasContent}
            kbId={selectedKb}
            contentSummary={hasContent ? buildContentSummary(bySourceType) : undefined}
            hasContent={hasContent}
            onOpenSources={() => setShowSources(true)}
          />
        </div>
      )}

      {/* ─── Sources Drawer ─── */}
      <SourcesDrawer
        isOpen={showSources}
        onClose={() => setShowSources(false)}
        contentStats={contentStats}
        totalChunks={totalChunks}
        contentItems={contentItems}
        bySourceType={bySourceType}
        mboxUploading={mboxUploading}
        onOpenModal={handleOpenModal}
        onDeleteContent={deleteContent}
        onRefresh={refresh}
        loading={loading}
      />

      {/* ─── Modals (unchanged) ─── */}

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
                  <p className="font-medium mb-1">Gmail</p>
                  <p className="text-text-secondary">Go to takeout.google.com → Export Mail → Sent folder</p>
                </div>
                <div className="p-3 bg-bg-secondary rounded-lg text-xs">
                  <p className="font-medium mb-1">Apple Mail</p>
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
    </div>
  );
}
