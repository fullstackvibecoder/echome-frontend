/**
 * EchoExchange.status.test.tsx
 * Tests for the honest ingest status flow (Task 7):
 *   - Shows "Importing to your voice..." while polling
 *   - Shows failure message + Retry on ingest failure
 *   - Shows success confirmation on terminal success
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EchoExchange } from './EchoExchange';
import type { EchoState } from './useEcho';

const BASE_STATE: EchoState = {
  phase: 'open',
  inputText: '',
  attachment: null,
  attachmentError: null,
  classification: null,
  selectedIntent: null,
  answer: null,
  receipts: [],
  error: null,
  confirmation: null,
  videoUrlTarget: null,
  videoFileTarget: null,
  fileUploadProgress: null,
  savedVideos: null,
  savedCount: null,
  videoOwnership: null,
  ingestPhase: null,
  pendingAction: null,
  answerUpsell: false,
};

const handlers = {
  setInputText: vi.fn(),
  submit: vi.fn(),
  selectIntent: vi.fn(),
  confirm: vi.fn(),
  reset: vi.fn(),
  chooseOwnership: vi.fn(),
  chooseDestination: vi.fn(),
  chooseFileDestination: vi.fn(),
  clipSavedVideo: vi.fn(),
  confirmAction: vi.fn(),
};

function renderExchange(overrides: Partial<EchoState>) {
  return render(<EchoExchange state={{ ...BASE_STATE, ...overrides }} handlers={handlers} />);
}

describe('EchoExchange ingest status', () => {
  it('shows "Importing to your voice..." when ingestPhase is importing, no success text visible', () => {
    renderExchange({ phase: 'done', ingestPhase: 'importing' });
    expect(screen.getByText(/Importing to your voice/)).toBeInTheDocument();
    expect(screen.queryByText(/Saved to clip later/)).not.toBeInTheDocument();
  });

  it('shows failure message and Retry button when ingestPhase is failed, no success text visible', () => {
    handlers.chooseFileDestination.mockClear();
    renderExchange({
      phase: 'done',
      ingestPhase: 'failed',
      videoFileTarget: { file: new File(['x'], 'test.mp4', { type: 'video/mp4' }) },
    });
    expect(screen.getByText(/Could not add to your voice/)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handlers.chooseFileDestination).toHaveBeenCalledWith('stockpile');
    expect(screen.queryByText(/Saved to clip later/)).not.toBeInTheDocument();
  });

  it('shows success confirmation title when ingestPhase is success', () => {
    renderExchange({
      phase: 'done',
      ingestPhase: 'success',
      confirmation: { title: 'Saved to clip later · added to your voice', detail: null },
    });
    expect(screen.getByText('Saved to clip later · added to your voice')).toBeInTheDocument();
  });
});
