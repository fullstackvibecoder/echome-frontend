import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateIntentButtons } from './CreateIntentButtons';

describe('CreateIntentButtons', () => {
  it('renders the three output intents', () => {
    render(<CreateIntentButtons onClipVideo={vi.fn()} onPrefill={vi.fn()} />);
    expect(screen.getByText('Turn a video into clips')).toBeInTheDocument();
    expect(screen.getByText('Write posts from a topic')).toBeInTheDocument();
    expect(screen.getByText('Create from what Echo knows')).toBeInTheDocument();
  });

  it('clip button opens the video flow', async () => {
    const onClipVideo = vi.fn();
    render(<CreateIntentButtons onClipVideo={onClipVideo} onPrefill={vi.fn()} />);
    await userEvent.click(screen.getByText('Turn a video into clips'));
    expect(onClipVideo).toHaveBeenCalledOnce();
  });

  it('prompt and KB buttons prefill the composer', async () => {
    const onPrefill = vi.fn();
    render(<CreateIntentButtons onClipVideo={vi.fn()} onPrefill={onPrefill} />);
    await userEvent.click(screen.getByText('Write posts from a topic'));
    expect(onPrefill).toHaveBeenCalledWith('Create content about ');
    await userEvent.click(screen.getByText('Create from what Echo knows'));
    expect(onPrefill).toHaveBeenCalledWith('Make content from my knowledge base');
  });
});
