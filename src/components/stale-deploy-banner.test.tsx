import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockPathname = '/app';
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const mockStale = { stale: true };
vi.mock('@/lib/use-deploy-version', () => ({ useDeployVersion: () => mockStale }));

import { StaleDeployBanner } from './stale-deploy-banner';
import { markBusy } from '@/lib/deploy-version';

describe('StaleDeployBanner', () => {
  const reload = vi.fn();

  beforeEach(() => {
    mockPathname = '/app';
    mockStale.stale = true;
    reload.mockReset();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
  });

  afterEach(() => vi.clearAllMocks());

  it('renders nothing while the bundle is current', () => {
    mockStale.stale = false;
    const { container } = render(<StaleDeployBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a refresh when a newer deploy is live', () => {
    render(<StaleDeployBanner />);
    expect(screen.getByText('EchoMe has been updated. Refresh to get the latest version.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('asks the user to wait instead of reloading during an upload', () => {
    const release = markBusy();
    render(<StaleDeployBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText('Your upload is still running. Refresh once it finishes.')).toBeInTheDocument();
    release();
  });

  it('reloads on the next page change, but not during an upload', async () => {
    const { rerender } = render(<StaleDeployBanner />);
    const release = markBusy();
    mockPathname = '/app/library';
    rerender(<StaleDeployBanner />);
    expect(reload).not.toHaveBeenCalled();
    release();
    mockPathname = '/app/calendar';
    rerender(<StaleDeployBanner />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('hides when dismissed', () => {
    render(<StaleDeployBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
