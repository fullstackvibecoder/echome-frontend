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
  const [mboxResult, setMboxResult] = useState<{ emailsIngested: number; chunksCreated: number } | null>(null);
  const mboxInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const currentKb = kbs.find((kb) => kb.id === selectedKb);

  const handleDelete = async (contentId: string) => {
    if (confirm('Are you sure you want to delete this content? This cannot be undone.')) {
      await deleteContent(contentId);
    }
  };

  const handleUpload = async () => {
    await doUpload();
    setShowUploadModal(false);
    await refresh();
  };

  const filteredContent = contentItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMboxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMboxUploading(true);
    setMboxProgress(0);
    setMboxResult(null);
    setShowMboxInstructions(false);

    try {
      const result = await api.kbContent.uploadMbox(
        file,
        { knowledgeBaseId: selectedKb ?? undefined },
        (progress) => setMboxProgress(progress)
      );

      setMboxResult({
        emailsIngested: result.emailsIngested,
        chunksCreated: result.chunksCreated,
      });

      await refresh();
    } catch (err) {
      console.error('MBOX upload error:', err);
      alert('Failed to upload MBOX file. Please try again.');
    } finally {
      setMboxUploading(false);
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
            accept=".mbox"
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
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex-1">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                Uploading email archive...
              </p>
              <div className="mt-2 h-2 bg-blue-100 dark:bg-blue-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${mboxProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MBOX Upload Result */}
      {mboxResult && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Email archive imported successfully!
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  {mboxResult.emailsIngested} emails processed, {mboxResult.chunksCreated} chunks created
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

      {/* Search */}
      {contentItems.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search content..."
            className="w-full max-w-md px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
          />
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
                  Import your sent emails to help Echo learn your writing style. We only extract YOUR sent emails from the archive.
                </p>

                {/* Gmail instructions */}
                <div className="p-4 bg-bg-secondary rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span>📧</span> Gmail (Google Takeout)
                  </h3>
                  <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">takeout.google.com</a></li>
                    <li>Click &quot;Deselect all&quot;, then scroll down and select only &quot;Mail&quot;</li>
                    <li>Click &quot;All Mail data included&quot; and select only &quot;Sent&quot; (optional but recommended)</li>
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
                    <li>Choose a location to save the .mbox file</li>
                    <li>Upload the exported file</li>
                  </ol>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Privacy note:</strong> We filter to only extract emails YOU sent. Received emails are ignored. Max file size: 500MB, up to 500 emails processed.
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
