import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let platformParam = 'linkedin';
vi.mock('next/navigation', () => ({
  useParams: () => ({ kitId: 'kit-1' }),
  useSearchParams: () => new URLSearchParams(`platform=${platformParam}`),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
let hook: Record<string, unknown>;
vi.mock('@/hooks/useContentKit', () => ({ useContentKitDetail: () => hook }));
const create = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ default: { scheduling: { create } } }));
vi.mock('@/components/content-kit/InlineWrittenContent', () => ({
  InlineWrittenContent: (p: { content: Record<string, string>; onSchedule?: () => void }) => (
    <div>
      <div data-testid="inline">{JSON.stringify(p.content)}</div>
      {p.onSchedule && <button onClick={p.onSchedule}>Schedule</button>}
    </div>
  ),
}));
vi.mock('@/components/scheduling', () => ({
  QuickScheduleModal: (p: { isOpen: boolean; defaultPlatform?: string; onSchedule: (d: unknown) => Promise<void> }) =>
    p.isOpen ? (
      <button onClick={() => p.onSchedule({ scheduledFor: '2026-11-24T14:00:00Z', platforms: [p.defaultPlatform] })}>
        Confirm {p.defaultPlatform}
      </button>
    ) : null,
}));

import SinglePostContent from './SinglePostContent';

const kit = (extra: Record<string, unknown> = {}) => ({
  loading: false,
  error: null,
  refresh: vi.fn(),
  item: { title: 'Rates' },
  detail: { contentKit: { id: 'kit-1', title: 'Rates', contentLinkedin: 'LI text', contentInstagram: 'IG text', ...extra }, content: [] },
});

beforeEach(() => {
  platformParam = 'linkedin';
  hook = kit();
  create.mockReset().mockResolvedValue({ success: true });
});

describe('single post page', () => {
  it('shows only the requested post and links to the full kit', () => {
    render(<SinglePostContent />);
    expect(screen.getByTestId('inline').textContent).toBe('{"linkedin":"LI text"}');
    expect(screen.getByRole('link', { name: 'See the full kit' }).getAttribute('href')).toBe('/app/library/kit-1');
  });

  it('schedules the written post for its platform', async () => {
    render(<SinglePostContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm linkedin' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      contentKitId: 'kit-1',
      platforms: ['linkedin'],
      contentType: 'written',
      contentSnapshot: { type: 'written', text: 'LI text' },
    });
  });

  it('shows Instagram as text with copy and sends scheduling to the kit', () => {
    platformParam = 'instagram';
    render(<SinglePostContent />);
    expect(screen.getByText('IG text')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
    expect(screen.getByText(/needs an image or video to post/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Schedule' })).toBeNull();
  });

  it('accepts backend platform keys like video_script', () => {
    platformParam = 'video_script';
    hook = kit({ contentVideoScript: 'Script' });
    render(<SinglePostContent />);
    expect(screen.getByTestId('inline').textContent).toBe('{"video-script":"Script"}');
  });

  it('handles a missing post and a missing kit', () => {
    platformParam = 'twitter';
    const { unmount } = render(<SinglePostContent />);
    expect(screen.getByText(/has no x post yet/)).toBeTruthy();
    unmount();
    hook = { ...kit(), detail: null, error: 'not found' };
    render(<SinglePostContent />);
    expect(screen.getByText(/couldn't find this post/)).toBeTruthy();
  });
});
