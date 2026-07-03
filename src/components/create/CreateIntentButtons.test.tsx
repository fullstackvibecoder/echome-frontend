import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateIntentButtons } from './CreateIntentButtons';

function renderButtons(overrides: Partial<Parameters<typeof CreateIntentButtons>[0]> = {}) {
  const props = {
    onClipVideo: vi.fn(),
    onPrefill: vi.fn(),
    onKnowledgeBase: vi.fn(),
    ...overrides,
  };
  render(<CreateIntentButtons {...props} />);
  return props;
}

describe('CreateIntentButtons', () => {
  it('renders the three output intents', () => {
    renderButtons();
    expect(screen.getByText('Turn a video into clips')).toBeInTheDocument();
    expect(screen.getByText('Write posts from a topic')).toBeInTheDocument();
    expect(screen.getByText('Create from what Echo knows')).toBeInTheDocument();
  });

  it('clip button opens the video flow', async () => {
    const { onClipVideo } = renderButtons();
    await userEvent.click(screen.getByText('Turn a video into clips'));
    expect(onClipVideo).toHaveBeenCalledOnce();
  });

  it('prompt button prefills the composer', async () => {
    const { onPrefill } = renderButtons();
    await userEvent.click(screen.getByText('Write posts from a topic'));
    expect(onPrefill).toHaveBeenCalledWith('Create content about ');
  });

  it('KB button fires the knowledge-base handler and reflects expanded state', async () => {
    const { onKnowledgeBase } = renderButtons({ kbExpanded: true });
    const kb = screen.getByText('Create from what Echo knows').closest('button')!;
    expect(kb).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(kb);
    expect(onKnowledgeBase).toHaveBeenCalledOnce();
  });
});
