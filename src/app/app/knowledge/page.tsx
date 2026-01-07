'use client';

import { useState, useRef } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { KBStats } from '@/components/kb-stats';
import { ContentItemCard } from '@/components/content-item-card';
import { UploadZone } from '@/components/upload-zone';
import { FileList } from '@/components/file-list';
import { PasteContentModal } from '@/components/paste-content-modal';
import { VoiceRecorder } from '@/components/voice-recorder';
import { SocialImportModal } from '@/components/social-import-modal';
import { api } from '@/lib/api-client';
import { parseMboxFile, estimateUploadSize, formatBytes } from '@/lib/mbox-parser';
import { isMboxFile } from '@/lib/file-utils';
import { MboxProgressUI } from '@/components/mbox-progress-ui';

export default function KnowledgePage() {
  const {
    kbs,
    contentItems,
    contentStats,
    loading,
    selectedKb,
    deleteContent,
    refresh,
  } = useKnowledgeBase();
  const { files: uploadFiles, uploading, addFiles, removeFile, uploadFiles: doUpload, totalSize } = useFileUpload();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showMboxInstructions, setShowMboxInstructions] = useState(false);
  const [mboxUploading, setMboxUploading] = useState(false);
  const [mboxProgress, setMboxProgress] = useState(0);
  const [mboxStatus, setMboxStatus] = useState<string>('');
  const [mboxResult, setMboxResult] = useState<{
    emailsIngested: number;
    chunksCreated: number;
    partial?: boolean;
    batchesCompleted?: number;
    totalBatches?: number;
  } | null>(null);
  const mboxInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const currentKb = kbs.find((kb) => kb.id === selectedKb);

  // Filter content based on search term
  const filteredContent = contentItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selection helpers
  const selectedCount = selectedIds.size;
  const allSelected = filteredContent.length > 0 && selectedIds.size === filteredContent.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
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

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMsg = `Are you sure you want to delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setBulkDeleting(true);
    try {
      // Delete items in parallel for speed
      const deletePromises = Array.from(selectedIds).map(id =>
        deleteContent(id).catch(err => {
          console.error(`Failed to delete ${id}:`, err);
          return { error: true, id };
        })
      );

      const results = await Promise.all(deletePromises);
      const failures = results.filter(r => r && typeof r === 'object' && 'error' in r);

      if (failures.length > 0) {
        alert(`${failures.length} item(s) failed to delete.`);
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Some items failed to delete. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (confirm('Are you sure you want to delete this content? This cannot be undone.')) {
      await deleteContent(contentId);
    }
  };

  const handleUpload = async () => {
    if (!selectedKb) {
      console.error('No knowledge base selected');
      return;
    }

    // Check if any files are MBOX - they need client-side parsing
    const mboxFiles = uploadFiles.filter(f => f.status === 'pending' && isMboxFile(f.file));
    const otherFiles = uploadFiles.filter(f => f.status === 'pending' && !isMboxFile(f.file));

    // Process MBOX files with client-side parsing
    if (mboxFiles.length > 0) {
      setShowUploadModal(false);
      for (const fileWithProgress of mboxFiles) {
        await processMboxFile(fileWithProgress.file);
      }
    }

    // Process other files with normal upload
    if (otherFiles.length > 0) {
      await doUpload(selectedKb);
      setShowUploadModal(false);
    } else if (mboxFiles.length === 0) {
      setShowUploadModal(false);
    }

    await refresh();
  };

  // Helper function to process MBOX file with client-side parsing
  const processMboxFile = async (file: File) => {
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if (fileSizeGB > 2) {
      const confirmed = confirm(
        `This file is ${fileSizeGB.toFixed(1)}GB. Parsing may take several minutes.\n\nFor faster processing, consider exporting only your "Sent" folder.\n\nContinue?`
      );
      if (!confirmed) return;
    }

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
        const reasons = Object.entries(parseResult.skippedReasons)
          .map(([reason, count]) => `${reason}: ${count}`)
          .join(', ');
        alert(
          `No emails found to import.\n\n` +
          `Total emails scanned: ${parseResult.totalEmailsFound}\n` +
          `Filtered out: ${parseResult.emailsFiltered}\n` +
          `Parse errors: ${parseResult.parseErrors}\n\n` +
          (reasons ? `Skip reasons: ${reasons}` : '') +
          `\n\nTip: Make sure you're uploading your "Sent" folder MBOX file.`
        );
        return;
      }

      const uploadSize = estimateUploadSize(parseResult.emails);
      const totalBatches = Math.ceil(parseResult.emails.length / 50);
      setMboxProgress(70);
      setMboxStatus(`Uploading ${parseResult.emails.length} emails in ${totalBatches} batches...`);

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
          const uploadProgress = 70 + Math.round((batchNum / totalBatches) * 30);
          setMboxProgress(uploadProgress);
          setMboxStatus(`Uploading batch ${batchNum}/${totalBatches}...`);
        },
      });

      setMboxProgress(100);
      setMboxStatus(result.partial ? 'Partially complete' : 'Complete!');
      setMboxResult({
        emailsIngested: result.emailsIngested,
        chunksCreated: result.chunksCreated,
        partial: result.partial,
        batchesCompleted: result.batchesCompleted,
        totalBatches: result.totalBatches,
      });
    } catch (err) {
      console.error('MBOX upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to import emails: ${errorMessage}`);
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
    }
  };

  const handleMboxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // No strict file size limit anymore - we parse client-side
    // But warn for very large files (over 2GB) that may be slow
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if (fileSizeGB > 2) {
      const confirmed = confirm(
        `This file is ${fileSizeGB.toFixed(1)}GB. Parsing may take several minutes.\n\nFor faster processing, consider exporting only your "Sent" folder.\n\nContinue?`
      );
      if (!confirmed) {
        if (mboxInputRef.current) {
          mboxInputRef.current.value = '';
        }
        return;
      }
    }

    setMboxUploading(true);
    setMboxProgress(0);
    setMboxStatus('Reading file...');
    setMboxResult(null);
    setShowMboxInstructions(false);

    try {
      // Step 1: Parse MBOX file client-side
      const parseResult = await parseMboxFile(file, {
        maxEmails: 100,
        minContentLength: 50,
        onProgress: ({ percent, emailsFound, status }) => {
          setMboxProgress(Math.round(percent * 0.7)); // First 70% is parsing
          setMboxStatus(status || `Found ${emailsFound} emails...`);
        },
      });

      if (parseResult.emails.length === 0) {
        const reasons = Object.entries(parseResult.skippedReasons)
          .map(([reason, count]) => `${reason}: ${count}`)
          .join(', ');
        alert(
          `No emails found to import.\n\n` +
          `Total emails scanned: ${parseResult.totalEmailsFound}\n` +
          `Filtered out: ${parseResult.emailsFiltered}\n` +
          `Parse errors: ${parseResult.parseErrors}\n\n` +
          (reasons ? `Skip reasons: ${reasons}` : '') +
          `\n\nTip: Make sure you're uploading your "Sent" folder MBOX file.`
        );
        return;
      }

      // Show parsing complete, now uploading in batches
      const uploadSize = estimateUploadSize(parseResult.emails);
      const totalBatches = Math.ceil(parseResult.emails.length / 50);
      setMboxProgress(70);
      setMboxStatus(`Uploading ${parseResult.emails.length} emails in ${totalBatches} batches...`);

      // Step 2: Upload pre-parsed emails as JSON (in batches of 50)
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
          // Progress from 70% to 100% during upload phase
          const uploadProgress = 70 + Math.round((batchNum / totalBatches) * 30);
          setMboxProgress(uploadProgress);
          setMboxStatus(`Uploading batch ${batchNum}/${totalBatches}...`);
        },
      });

      setMboxProgress(100);
      setMboxStatus(result.partial ? 'Partially complete' : 'Complete!');
      setMboxResult({
        emailsIngested: result.emailsIngested,
        chunksCreated: result.chunksCreated,
        partial: result.partial,
        batchesCompleted: result.batchesCompleted,
        totalBatches: result.totalBatches,
      });

      await refresh();
    } catch (err) {
      console.error('MBOX upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to import emails: ${errorMessage}`);
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
      if (mboxInputRef.current) {
        mboxInputRef.current.value = '';
      }
    }
  };

  const handleVoiceSaved = async () => {
    setShowVoiceModal(false);
    await refresh();
  };

  const handleSocialImportComplete = async () => {
    await refresh();
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-4xl mb-2">Your Echo</h1>
          <p className="text-body text-text-secondary">
            {contentStats && contentStats.totalItems > 0
              ? `${contentStats.totalItems} content item${contentStats.totalItems !== 1 ? 's' : ''} with ${contentStats.totalChunks} training chunks`
              : 'Train your voice by adding your writing'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowVoiceModal(true)}
            className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors flex items-center gap-2"
            title="Record voice sample"
          >
            <span>🎤</span>
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button
            onClick={() => setShowSocialModal(true)}
            className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors flex items-center gap-2"
            title="Import from social media"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Social</span>
          </button>
          <button
            onClick={() => setShowMboxInstructions(true)}
            disabled={mboxUploading}
            className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Import email archive"
          >
            <span>📧</span>
            <span className="hidden sm:inline">Email</span>
          </button>
          <input
            ref={mboxInputRef}
            type="file"
            accept=".mbox,application/mbox,application/octet-stream,text/plain"
            onChange={handleMboxUpload}
            className="hidden"
          />
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors flex items-center gap-2"
            title="Paste text content"
          >
            <span>✍️</span>
            <span className="hidden sm:inline">Paste</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <span>📤</span>
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* MBOX Upload Progress */}
      {mboxUploading && (
        <MboxProgressUI
          progress={mboxProgress}
          status={mboxStatus}
        />
      )}

      {/* MBOX Upload Result - always show as success since emails were ingested */}
      {mboxResult && (
        <div className="mb-6 p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  Email archive imported successfully!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {mboxResult.emailsIngested} emails processed, {mboxResult.chunksCreated.toLocaleString()} chunks created
                </p>
              </div>
            </div>
            <button
              onClick={() => setMboxResult(null)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <KBStats stats={contentStats} kbName={currentKb?.name} />

      {/* Search and Bulk Actions */}
      {contentItems.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Search bar row */}
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content..."
              className="flex-1 max-w-md px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
            />
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                className="px-4 py-2.5 bg-accent/10 border-2 border-accent text-accent rounded-lg hover:bg-accent/20 transition-colors font-medium flex items-center gap-2"
              >
                <span>☑️</span> Select
              </button>
            ) : (
              <button
                onClick={handleCancelSelection}
                className="px-4 py-2.5 border-2 border-error/50 text-error rounded-lg hover:bg-error/10 transition-colors font-medium"
              >
                ✕ Cancel
              </button>
            )}
          </div>

          {/* Bulk action toolbar - only visible in selection mode */}
          {selectionMode && (
            <div className="flex items-center justify-between p-4 bg-accent/5 border-2 border-accent/20 rounded-lg">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded border-2 border-accent text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm font-medium">
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </span>
                </label>
                <span className="text-sm text-text-secondary">
                  {selectedCount} of {filteredContent.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedCount === 0 || bulkDeleting}
                  className="px-4 py-2 bg-error/10 border border-error/30 text-error rounded-lg hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {bulkDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      🗑️ Delete ({selectedCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content Grid */}
      {!loading && filteredContent.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
            <ContentItemCard
              key={item.id}
              item={item}
              onDelete={() => handleDelete(item.id)}
              selected={selectedIds.has(item.id)}
              onSelect={(selected) => handleSelectItem(item.id, selected)}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      )}

      {/* Empty State with Instructions */}
      {!loading && contentItems.length === 0 && (
        <div className="space-y-8">
          {/* Hero empty state */}
          <div className="text-center py-12 card bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-subheading text-2xl mb-2">Train Your Echo</h3>
            <p className="text-body text-text-secondary mb-2 max-w-xl mx-auto">
              Your Echo learns from YOUR writing style. The more authentic content you add, the more accurately it can generate content that sounds like you.
            </p>
            <p className="text-sm text-text-secondary mb-6 max-w-xl mx-auto">
              Best sources: emails you&apos;ve written, LinkedIn posts, blog articles, social captions
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => setShowPasteModal(true)}
                className="px-6 py-3 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors"
              >
                ✍️ Paste Content
              </button>
              <button
                onClick={() => setShowSocialModal(true)}
                className="px-6 py-3 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors"
              >
                📱 Import Social
              </button>
              <button
                onClick={() => setShowMboxInstructions(true)}
                className="px-6 py-3 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors"
              >
                📧 Import Emails
              </button>
            </div>
          </div>

          {/* Quick start cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-3xl mb-3">✍️</div>
              <h4 className="font-semibold mb-2">Paste Text</h4>
              <p className="text-sm text-text-secondary mb-3">
                Copy-paste emails, LinkedIn posts, or articles you&apos;ve written. Works great for quick additions.
              </p>
              <button
                onClick={() => setShowPasteModal(true)}
                className="text-sm text-accent hover:underline"
              >
                Add content →
              </button>
            </div>

            <div className="card p-5">
              <div className="text-3xl mb-3">🎤</div>
              <h4 className="font-semibold mb-2">Voice Recording</h4>
              <p className="text-sm text-text-secondary mb-3">
                Record yourself speaking naturally. We&apos;ll transcribe it and learn your conversational style.
              </p>
              <button
                onClick={() => setShowVoiceModal(true)}
                className="text-sm text-accent hover:underline"
              >
                Record now →
              </button>
            </div>

            <div className="card p-5">
              <div className="text-3xl mb-3">🎬</div>
              <h4 className="font-semibold mb-2">YouTube Import</h4>
              <p className="text-sm text-text-secondary mb-3">
                Import transcripts from your YouTube videos or your entire channel.
              </p>
              <button
                onClick={() => setShowSocialModal(true)}
                className="text-sm text-accent hover:underline"
              >
                Import videos →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-subheading text-2xl">Upload Files</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-text-secondary hover:text-text-primary text-2xl"
                >
                  ✕
                </button>
              </div>

              <UploadZone onFilesAdded={addFiles} disabled={uploading} />

              <FileList
                files={uploadFiles}
                onRemove={removeFile}
                totalSize={totalSize}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-border rounded-lg text-body hover:border-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadFiles.length === 0}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MBOX Instructions Modal */}
      {showMboxInstructions && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMboxInstructions(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-subheading text-2xl">Import Email Archive</h2>
                <button
                  onClick={() => setShowMboxInstructions(false)}
                  className="text-text-secondary hover:text-text-primary text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-body text-text-secondary">
                  Import your sent emails to help Echo learn your writing style. Files of any size are supported - we parse them locally in your browser.
                </p>

                {/* How it works */}
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    <strong>How it works:</strong> Your email file is parsed entirely in your browser. Only the extracted text from emails you sent is uploaded - attachments and received emails are discarded locally.
                  </p>
                </div>

                {/* Gmail instructions */}
                <div className="p-4 bg-bg-secondary rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span>📧</span> Gmail (Google Takeout)
                  </h3>
                  <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">takeout.google.com</a></li>
                    <li>Click &quot;Deselect all&quot;, then scroll down and select only &quot;Mail&quot;</li>
                    <li>Click &quot;All Mail data included&quot; and select only &quot;Sent&quot; (recommended)</li>
                    <li>Click &quot;Next step&quot; and create export</li>
                    <li>Download and extract the ZIP file</li>
                    <li>Upload the .mbox file from the Mail folder</li>
                  </ol>
                </div>

                {/* Outlook instructions */}
                <div className="p-4 bg-bg-secondary rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span>📬</span> Outlook
                  </h3>
                  <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Open Outlook and go to File → Open & Export → Import/Export</li>
                    <li>Select &quot;Export to a file&quot; → Next</li>
                    <li>Choose &quot;Outlook Data File (.pst)&quot;</li>
                    <li>Select your Sent folder and export</li>
                    <li>Convert PST to MBOX using a free converter tool</li>
                  </ol>
                </div>

                {/* Apple Mail instructions */}
                <div className="p-4 bg-bg-secondary rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span>🍎</span> Apple Mail
                  </h3>
                  <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Open Mail and select your &quot;Sent&quot; mailbox</li>
                    <li>Go to Mailbox → Export Mailbox...</li>
                    <li>Choose a location to save the .mbox folder</li>
                    <li>Right-click the .mbox folder → &quot;Show Package Contents&quot;</li>
                    <li>Upload the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">mbox</code> file inside (no extension)</li>
                  </ol>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Note:</strong> Up to 500 of your most recent sent emails will be processed for voice matching.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMboxInstructions(false)}
                    className="flex-1 px-4 py-3 border-2 border-border rounded-lg text-body hover:border-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => mboxInputRef.current?.click()}
                    className="flex-1 btn-primary py-3"
                  >
                    Select MBOX File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Paste Content Modal */}
      <PasteContentModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onSuccess={refresh}
        knowledgeBaseId={selectedKb ?? undefined}
      />

      {/* Voice Recording Modal */}
      {showVoiceModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowVoiceModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Record Voice Sample
                </h2>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <VoiceRecorder
                  onSaved={handleVoiceSaved}
                  knowledgeBaseId={selectedKb ?? undefined}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Social Import Modal */}
      <SocialImportModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        onImportComplete={handleSocialImportComplete}
        knowledgeBaseId={selectedKb ?? undefined}
      />
    </div>
  );
}
