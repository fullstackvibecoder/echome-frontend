'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validateFile, isMboxFile, isAudioFile } from '@/lib/file-utils';
import { parseMboxFile } from '@/lib/mbox-parser';
import { FileList } from '@/components/file-list';
import { VoiceRecorder } from '@/components/voice-recorder';

interface KBUnifiedInputProps {
  knowledgeBaseId: string | null;
  onImportComplete: () => void;
}

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.txt,.mp3,.m4a,.wav,.ogg,.flac,.mbox';
const MBOX_ACCEPT = '.mbox,application/mbox,application/octet-stream,text/plain';

type PlatformHint = 'youtube' | 'instagram' | 'blog' | null;

export function KBUnifiedInput({ knowledgeBaseId, onImportComplete }: KBUnifiedInputProps) {
  // Text input
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState('Paste your best writing, a YouTube link, or drop a file — Echo learns your voice from it');
  const [platformHint, setPlatformHint] = useState<PlatformHint>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // File upload
  const { files: uploadFiles, uploading, addFiles, removeFile, uploadFiles: doUpload, clearFiles, totalSize } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mboxFileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  // Voice recording
  const [recording, setRecording] = useState(false);

  // URL import polling
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlStatus, setUrlStatus] = useState('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MBOX import
  const [mboxUploading, setMboxUploading] = useState(false);
  const [mboxProgress, setMboxProgress] = useState(0);
  const [mboxStatus, setMboxStatus] = useState('');
  const [mboxResult, setMboxResult] = useState<{ emailsIngested: number; chunksCreated: number } | null>(null);

  // Submitting text/paste
  const [submitting, setSubmitting] = useState(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // --- Smart detection ---
  const isUrl = (value: string): boolean => {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
  };

  const detectPlatform = (url: string): 'youtube' | 'instagram' | 'blog' => {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('instagram.com')) return 'instagram';
    return 'blog';
  };

  // --- URL import with polling ---
  const startUrlImport = async (url: string) => {
    if (!knowledgeBaseId) {
      toast.error('No knowledge base selected');
      return;
    }

    setUrlImporting(true);
    setUrlStatus('Starting import...');

    try {
      const platform = platformHint || detectPlatform(url);
      const result = await api.kbContent.startSocialImport({
        platform,
        url: url.trim(),
        knowledgeBaseId,
      });

      if (!result.success || !result.jobId) {
        toast.error(result.message || 'Failed to start import');
        setUrlImporting(false);
        setUrlStatus('');
        return;
      }

      // Start polling
      let pollCount = 0;
      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount < 12) {
          setUrlStatus('This usually takes 1-2 minutes');
        } else if (pollCount < 36) {
          setUrlStatus('Still processing...');
        } else {
          setUrlStatus('Almost there...');
        }

        if (pollCount >= 60) {
          // Timeout
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setUrlImporting(false);
          setUrlStatus('');
          toast.error('Import timed out. Please try again.');
          return;
        }

        try {
          const status = await api.kbContent.getSocialImportStatus(result.jobId);
          const job = status.job;

          if (job?.status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setUrlImporting(false);
            setUrlStatus('');
            setText('');
            toast.success(`Imported ${job.contentCount || 0} items from ${platform}`);
            onImportComplete();
          } else if (job?.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setUrlImporting(false);
            setUrlStatus('');
            toast.error(job.message || 'Import failed');
          }
        } catch {
          // Silently retry on network errors during polling
        }
      }, 5000);
    } catch (err) {
      setUrlImporting(false);
      setUrlStatus('');
      toast.error(extractErrorMessage(err, 'Import failed. Please try again.'));
    }
  };

  // --- MBOX processing (verbatim from KnowledgeContent.tsx) ---
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
        knowledgeBaseId: knowledgeBaseId ?? undefined,
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

      onImportComplete();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to import emails. Please try again.'));
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
    }
  };

  // --- File handling ---
  // Audio files go to the dedicated Whisper voice-ingest endpoint — the
  // document uploader can't process them (FUL-26: audio sent there was stored
  // but never transcribed). Sequential: transcription is the bottleneck anyway.
  const processAudioFiles = useCallback(async (audioFiles: File[]) => {
    for (const file of audioFiles) {
      const toastId = toast.loading(`Transcribing ${file.name}…`);
      try {
        const result = await api.kbContent.ingestVoice({
          audioBlob: file,
          title: file.name,
          knowledgeBaseId: knowledgeBaseId || undefined,
          fileName: file.name,
        });
        toast.success(
          `${file.name} transcribed — ${result.chunksCreated} voice pattern${result.chunksCreated === 1 ? '' : 's'} added`,
          { id: toastId }
        );
      } catch (err) {
        toast.error(extractErrorMessage(err, `Failed to transcribe ${file.name}`), { id: toastId });
      }
    }
    onImportComplete();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeBaseId, onImportComplete]);

  const handleFiles = useCallback((fileList: File[]) => {
    const mboxFiles: File[] = [];
    const audioFiles: File[] = [];
    const regularFiles: File[] = [];

    for (const file of fileList) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || `Invalid file: ${file.name}`);
        continue;
      }

      if (isMboxFile(file)) {
        mboxFiles.push(file);
      } else if (isAudioFile(file)) {
        audioFiles.push(file);
      } else {
        regularFiles.push(file);
      }
    }

    // Process MBOX files (take first one)
    if (mboxFiles.length > 0) {
      processMboxFile(mboxFiles[0]);
    }

    // Audio → transcription flow (not the document uploader)
    if (audioFiles.length > 0) {
      processAudioFiles(audioFiles);
    }

    // Queue regular files for upload
    if (regularFiles.length > 0) {
      addFiles(regularFiles);
      if (knowledgeBaseId) {
        // Auto-upload after adding
        setTimeout(() => {
          doUpload(knowledgeBaseId);
        }, 100);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeBaseId, addFiles, doUpload, processAudioFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFiles(Array.from(files));
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleMboxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processMboxFile(file);
    e.target.value = '';
  };

  // --- Drag and drop ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  // --- Submit handler ---
  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isUrl(trimmed)) {
      await startUrlImport(trimmed);
      return;
    }

    // Plain text
    if (trimmed.length < 50) {
      toast.error('Enter at least 50 characters, or paste a URL');
      return;
    }

    if (!knowledgeBaseId) {
      toast.error('No knowledge base selected');
      return;
    }

    setSubmitting(true);
    try {
      await api.kbContent.paste({
        text: trimmed,
        sourceType: 'text',
        knowledgeBaseId,
      });
      toast.success('Content added to Knowledge Base');
      setText('');
      setPlatformHint(null);
      setPlaceholder('Paste your best writing, a YouTube link, or drop a file — Echo learns your voice from it');
      onImportComplete();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save content. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Keyboard submit ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isBusy = submitting || urlImporting || mboxUploading || uploading;

  return (
    <div className="space-y-3">
      {/* Main input card */}
      <div
        className={`bg-card border rounded-xl shadow-sm transition-colors ${
          dragging ? 'border-accent bg-accent/5' : 'border-border'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Textarea */}
        <div className="p-4 pb-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            disabled={isBusy}
            className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed"
          />
        </div>

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1">
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>

            {/* Mic button */}
            <button
              type="button"
              onClick={() => setRecording(!recording)}
              disabled={isBusy && !recording}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                recording
                  ? 'text-red-500 bg-red-50 dark:bg-red-950'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={recording ? 'Close recorder' : 'Record voice'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </button>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy || !text.trim()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Submit (Cmd+Enter)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Helper text — what you can add */}
      <p className="text-[11px] text-muted-foreground/70 leading-relaxed px-1">
        YouTube links · Instagram profiles · blog URLs · PDFs · text you wrote · voice recordings · Gmail exports (
        <a href="/guides/email-upload" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          .mbox — how to export
        </a>
        )
      </p>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={mboxFileInputRef}
        type="file"
        accept={MBOX_ACCEPT}
        onChange={handleMboxInputChange}
        className="hidden"
      />

      {/* --- Progress areas (shown conditionally) --- */}

      {/* URL import status */}
      {urlImporting && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{urlStatus}</p>
        </div>
      )}

      {/* MBOX progress */}
      {mboxUploading && (
        <div className="p-4 bg-card border border-border rounded-xl space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{mboxStatus}</span>
            <span className="text-muted-foreground font-medium">{mboxProgress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${mboxProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* MBOX result */}
      {mboxResult && !mboxUploading && (
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-sm text-foreground">
            Imported {mboxResult.emailsIngested} emails ({mboxResult.chunksCreated} chunks created)
          </p>
        </div>
      )}

      {/* File upload progress */}
      {uploadFiles.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <FileList files={uploadFiles} onRemove={removeFile} totalSize={totalSize} />
          {!uploading && uploadFiles.some((f) => f.status === 'completed') && (
            <button
              type="button"
              onClick={clearFiles}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear list
            </button>
          )}
        </div>
      )}

      {/* Voice recorder */}
      {recording && (
        <VoiceRecorder
          knowledgeBaseId={knowledgeBaseId ?? undefined}
          onSaved={() => {
            setRecording(false);
            onImportComplete();
          }}
          className="border border-border"
        />
      )}

      {/* Submitting text indicator */}
      {submitting && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-muted-foreground">Saving content...</p>
        </div>
      )}
    </div>
  );
}

export default KBUnifiedInput;
