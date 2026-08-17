/**
 * KBUnifiedInput.bulk-links.test.tsx
 *
 * Bulk link paste (FUL-34): pasting two or more URLs into the unified input
 * routes to api.kbContent.ingestLinkBatch instead of the single-URL social
 * import or the plain-text paste. Verifies:
 *   - two URLs submit as one batch with the knowledge base id
 *   - accepted counts surface in a success toast and the input clears
 *   - rejected links surface as feedback without failing the batch
 *   - a single URL still uses the existing startSocialImport flow
 *   - a batch API failure shows an error and keeps the text for retry
 *
 * No em or en dashes in any asserted copy.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks (must precede the component import) ----

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: {
      paste: vi.fn(),
      ingestLinkBatch: vi.fn(),
      startSocialImport: vi.fn(),
      getSocialImportStatus: vi.fn(),
      ingestParsedEmails: vi.fn(),
      ingestVoice: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    files: [],
    uploading: false,
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    uploadFiles: vi.fn(),
    clearFiles: vi.fn(),
    totalSize: 0,
  }),
}));

vi.mock('@/lib/mbox-parser', () => ({ parseMboxFile: vi.fn() }));
vi.mock('@/components/file-list', () => ({ FileList: () => null }));
vi.mock('@/components/voice-recorder', () => ({ VoiceRecorder: () => null }));

// ---- Imports after mocks ----

import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { KBUnifiedInput } from './KBUnifiedInput';

// ---- Helpers ----

const KB_ID = 'kb-123';
const TWO_URLS = 'https://youtu.be/abc\nhttps://example.com/blog-post';

function typeAndSubmit(value: string) {
  const textarea = screen.getByRole('textbox');
  fireEvent.change(textarea, { target: { value } });
  fireEvent.click(screen.getByTitle('Submit (Cmd+Enter)'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.kbContent.ingestLinkBatch).mockResolvedValue({
    success: true,
    accepted: {
      videos: [{ url: 'https://youtu.be/abc', uploadId: 'up-1', alreadyExisted: false }],
      articles: ['https://example.com/blog-post'],
    },
    rejected: [],
  });
  vi.mocked(api.kbContent.startSocialImport).mockResolvedValue({
    success: true,
    jobId: 'job-1',
    status: 'processing',
    platform: 'youtube',
  });
});

// ---- Tests ----

describe('KBUnifiedInput bulk link paste', () => {
  it('submits two pasted URLs as one batch with the knowledge base id', async () => {
    render(<KBUnifiedInput knowledgeBaseId={KB_ID} onImportComplete={vi.fn()} />);
    typeAndSubmit(TWO_URLS);

    await waitFor(() => {
      expect(api.kbContent.ingestLinkBatch).toHaveBeenCalledWith({
        urls: ['https://youtu.be/abc', 'https://example.com/blog-post'],
        knowledgeBaseId: KB_ID,
      });
    });
    expect(api.kbContent.startSocialImport).not.toHaveBeenCalled();
    expect(api.kbContent.paste).not.toHaveBeenCalled();
  });

  it('shows accepted counts, clears the input, and refreshes on success', async () => {
    const onImportComplete = vi.fn();
    render(<KBUnifiedInput knowledgeBaseId={KB_ID} onImportComplete={onImportComplete} />);
    typeAndSubmit(TWO_URLS);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/1 video.*1 article/i),
      );
    });
    expect(onImportComplete).toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });

  it('surfaces rejected links as feedback without failing the batch', async () => {
    vi.mocked(api.kbContent.ingestLinkBatch).mockResolvedValue({
      success: true,
      accepted: { videos: [], articles: ['https://example.com/a'] },
      rejected: [{ url: 'ftp://nope', reason: 'Only http(s) links are supported' }],
    });
    render(<KBUnifiedInput knowledgeBaseId={KB_ID} onImportComplete={vi.fn()} />);
    typeAndSubmit('https://example.com/a\nftp://nope\nhttps://example.com/b');

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Only http(s) links are supported'),
      );
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('keeps the single-URL social import flow for one URL', async () => {
    render(<KBUnifiedInput knowledgeBaseId={KB_ID} onImportComplete={vi.fn()} />);
    typeAndSubmit('https://youtu.be/only-one');

    await waitFor(() => {
      expect(api.kbContent.startSocialImport).toHaveBeenCalled();
    });
    expect(api.kbContent.ingestLinkBatch).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the text when the batch call fails', async () => {
    vi.mocked(api.kbContent.ingestLinkBatch).mockRejectedValue(new Error('network down'));
    render(<KBUnifiedInput knowledgeBaseId={KB_ID} onImportComplete={vi.fn()} />);
    typeAndSubmit(TWO_URLS);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(TWO_URLS);
  });
});
