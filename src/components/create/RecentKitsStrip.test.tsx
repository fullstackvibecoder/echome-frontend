import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecentKitsStrip } from './RecentKitsStrip';

const listMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { contentKits: { list: (...args: unknown[]) => listMock(...args) } },
}));

function kit(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Kit ${id}`,
    thumbnailUrl: undefined,
    clipsGenerated: 2,
    contentGenerated: true,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    hasLinkedin: true, hasTwitter: true, hasInstagram: false,
    hasBlog: false, hasEmail: false, hasTiktok: false, hasYoutube: false,
    ...overrides,
  };
}

describe('RecentKitsStrip', () => {
  beforeEach(() => listMock.mockReset());

  it('renders up to 4 recent kits with links into the kit detail', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [kit('a'), kit('b')] } });
    render(<RecentKitsStrip />);
    await waitFor(() => expect(screen.getByText('Kit a')).toBeInTheDocument());
    expect(listMock).toHaveBeenCalledWith(4);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const cards = screen.getAllByTestId('recent-kit-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('href', '/app/library/a');
    expect(screen.getByRole('link', { name: /view all in library/i })).toHaveAttribute('href', '/app/library');
  });

  it('shows Processing status when contentGenerated is false', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [kit('a', { contentGenerated: false })] } });
    render(<RecentKitsStrip />);
    await waitFor(() => expect(screen.getByText('Processing')).toBeInTheDocument());
  });

  it('renders nothing when the list is empty', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [] } });
    const { container } = render(<RecentKitsStrip />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the fetch fails', async () => {
    listMock.mockRejectedValue(new Error('network'));
    const { container } = render(<RecentKitsStrip />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
