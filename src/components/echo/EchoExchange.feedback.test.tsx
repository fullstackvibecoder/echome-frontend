/**
 * EchoExchange.feedback.test.tsx
 * Covers the upload-feedback work: the loud AttachmentCard, the confirmation
 * success card in the done phase, and the louder "press Enter" hint shown when
 * a file is attached with no typed text. EchoExchange and AttachmentCard are
 * both presentational, so they render real off props with no mocks.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EchoExchange } from './EchoExchange';
import { AttachmentCard } from './AttachmentCard';
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

describe('EchoExchange upload feedback', () => {
  it('renders a loud confirmation card with title, detail, and Add another in the done phase', () => {
    renderExchange({ phase: 'done', confirmation: { title: 'Added to your Voice', detail: 'resume.pdf' } });
    expect(screen.getByText('Added to your Voice')).toBeTruthy();
    expect(screen.getByText('resume.pdf')).toBeTruthy();
    expect(screen.getByText('Echo can use this now.')).toBeTruthy();
    expect(screen.getByText('Add another')).toBeTruthy();
  });

  it('falls back to the bare DONE row when there is no confirmation', () => {
    renderExchange({ phase: 'done', confirmation: null });
    expect(screen.getByText('DONE')).toBeTruthy();
    expect(screen.getByText('Ask another')).toBeTruthy();
  });

  it('shows the louder press-Enter hint when a file is attached with no text', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    renderExchange({ phase: 'open', attachment: file, inputText: '' });
    expect(screen.getByText('Press Enter to send this to Echo.')).toBeTruthy();
  });
});

describe('AttachmentCard', () => {
  it('shows file name, kind label, and a Ready state with a remove button', () => {
    const file = new File(['x'], 'interview.mp4', { type: 'video/mp4' });
    const onRemove = vi.fn();
    render(<AttachmentCard file={file} onRemove={onRemove} />);
    expect(screen.getByText('interview.mp4')).toBeTruthy();
    expect(screen.getByText(/Video/)).toBeTruthy();
    expect(screen.getByText(/Ready/)).toBeTruthy();
    expect(screen.getByLabelText('Remove interview.mp4')).toBeTruthy();
  });
});
