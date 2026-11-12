import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: { create: () => ({ get: getMock, post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }) },
}));

import { api } from './api-client';

describe('clips.list includeFailed', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ data: { success: true, data: { uploads: [] } } });
  });

  it('sends includeFailed=true when asked', async () => {
    await api.clips.list(100, 0, { includeFailed: true });
    expect(getMock).toHaveBeenCalledWith('/clips', { params: { limit: 100, offset: 0, includeFailed: true } });
  });

  it('does not send includeFailed by default', async () => {
    await api.clips.list(20, 0);
    expect(getMock.mock.calls[0][1].params).not.toHaveProperty('includeFailed');
  });
});
