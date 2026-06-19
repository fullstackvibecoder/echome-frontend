/**
 * EchoExchange.fork.test.tsx
 * Tests for the destination fork UI: shown when videoUrlTarget is set in
 * the confirming phase, replacing the standard intent chips.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EchoExchange } from './EchoExchange';
import type { EchoState } from './useEcho';

// BASE_STATE is not exported from the feedback test file, so copy its literal
// here and extend with the new fields.
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
  savedVideos: null,
  savedCount: null,
};

const handlers = {
  setInputText: vi.fn(),
  submit: vi.fn(),
  selectIntent: vi.fn(),
  confirm: vi.fn(),
  reset: vi.fn(),
  chooseDestination: vi.fn(),
  clipSavedVideo: vi.fn(),
};

function renderExchange(overrides: Partial<EchoState>) {
  return render(<EchoExchange state={{ ...BASE_STATE, ...overrides }} handlers={handlers} />);
}

describe('EchoExchange destination fork', () => {
  it('renders single-video fork copy and routes "Make content now" to create', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: { platform: 'youtube', kind: 'single' } });
    expect(screen.getByText('Add to Voice/KB')).toBeInTheDocument();
    const btn = screen.getByText('Make content now');
    fireEvent.click(btn);
    expect(handlers.chooseDestination).toHaveBeenCalledWith('create');
  });

  it('renders channel fork copy and routes "Save videos to clip later" to stockpile', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: { platform: 'youtube', kind: 'channel' } });
    expect(screen.getByText('Add to Voice/KB')).toBeInTheDocument();
    const btn = screen.getByText('Save videos to clip later');
    fireEvent.click(btn);
    expect(handlers.chooseDestination).toHaveBeenCalledWith('stockpile');
  });

  it('does NOT render the fork when videoUrlTarget is null (intent chips path)', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: null });
    expect(screen.queryByText('Save videos to clip later')).not.toBeInTheDocument();
  });
});
