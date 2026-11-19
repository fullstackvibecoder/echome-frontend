/**
 * EchoExchange.ownership.test.tsx
 * Tests for the video ownership chip (Task 6):
 *   - "This is me" / "Not me - write my take" chips when videoOwnership is null
 *   - The Create/Store fork is hidden until ownership is answered
 *   - After ownership is chosen, the fork shows and the "Add to Voice" button is absent
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
  attachmentNote: null,
  classification: null,
  selectedIntent: null,
  answer: null,
  receipts: [],
  error: null,
  confirmation: null,
  clipJob: null,
  videoUrlTarget: null,
  videoFileTarget: null,
  fileUploadProgress: null,
  savedVideos: null,
  savedCount: null,
  videoOwnership: null,
  takeTarget: null,
  takeAngle: '',
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
  chooseDestination: vi.fn(),
  chooseFileDestination: vi.fn(),
  clipSavedVideo: vi.fn(),
  confirmAction: vi.fn(),
  chooseOwnership: vi.fn(),
  setTakeAngle: vi.fn(),
  writeTake: vi.fn(),
};

function renderExchange(overrides: Partial<EchoState>) {
  return render(<EchoExchange state={{ ...BASE_STATE, ...overrides }} handlers={handlers} />);
}

describe('EchoExchange ownership chips', () => {
  it('shows both ownership chips when videoUrlTarget is set and videoOwnership is null', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: null,
    });
    expect(screen.getByRole('button', { name: /this is me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not me/i })).toBeInTheDocument();
  });

  it('does NOT show the Create/Store destination fork when videoOwnership is null', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: null,
    });
    expect(screen.queryByText('Make content now')).not.toBeInTheDocument();
    expect(screen.queryByText('Save videos to clip later')).not.toBeInTheDocument();
    expect(screen.queryByText('Save to clip later')).not.toBeInTheDocument();
  });

  it('calls chooseOwnership("self") when "This is me" chip is clicked', () => {
    handlers.chooseOwnership.mockClear();
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: null,
    });
    fireEvent.click(screen.getByRole('button', { name: /this is me/i }));
    expect(handlers.chooseOwnership).toHaveBeenCalledWith('self');
  });

  it('calls chooseOwnership("third_party") when "Not me - write my take" chip is clicked', () => {
    handlers.chooseOwnership.mockClear();
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: null,
    });
    fireEvent.click(screen.getByRole('button', { name: /not me/i }));
    expect(handlers.chooseOwnership).toHaveBeenCalledWith('third_party');
  });

  it('hides ownership chips and shows fork once videoOwnership is set', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: 'self',
    });
    // Chips should be gone
    expect(screen.queryByRole('button', { name: /this is me/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /not me/i })).not.toBeInTheDocument();
    // Fork button should be visible
    expect(screen.getByText('Make content now')).toBeInTheDocument();
  });

  it('does NOT render an "Add to Voice" button after ownership is chosen', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: 'self',
    });
    expect(screen.queryByText(/add to voice/i)).not.toBeInTheDocument();
  });

  it('shows "Save videos to clip later" for the user\'s own channel', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'channel' },
      videoOwnership: 'self',
    });
    expect(screen.getByText('Save videos to clip later')).toBeInTheDocument();
    expect(screen.queryByText(/add to voice/i)).not.toBeInTheDocument();
  });

  it('offers "Follow on Radar" for someone else\'s channel', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'channel' },
      videoOwnership: 'third_party',
    });
    expect(screen.getByText('Follow on Radar')).toBeInTheDocument();
    expect(screen.queryByText('Save videos to clip later')).not.toBeInTheDocument();
    expect(screen.queryByText(/train your voice/i)).not.toBeInTheDocument();
  });

  it('shows the take card, not "Make content now", for someone else\'s single video', () => {
    handlers.writeTake.mockClear();
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: 'third_party',
      takeTarget: { contentId: 'c-1', title: 'Housing talk', thumbnailUrl: null },
    });
    expect(screen.queryByText('Make content now')).not.toBeInTheDocument();
    expect(screen.getByText('Housing talk')).toBeInTheDocument();
    expect(screen.getByLabelText(/add your take/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /write my take/i }));
    expect(handlers.writeTake).toHaveBeenCalled();
  });

  it('says it is reading the video while Radar fetches it', () => {
    renderExchange({
      phase: 'executing',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: 'third_party',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/reading the video/i);
  });

  it('renders the consent line when a videoUrlTarget is present', () => {
    renderExchange({
      phase: 'confirming',
      videoUrlTarget: { platform: 'youtube', kind: 'single' },
      videoOwnership: null,
    });
    expect(screen.getByText(/videos you add train your voice/i)).toBeInTheDocument();
  });
});
