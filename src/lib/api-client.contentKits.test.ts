import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: { create: () => ({ get: getMock, post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }) },
}));

import { api } from './api-client';

describe('contentKits.get transform', () => {
  beforeEach(() => getMock.mockReset());

  it('maps all 8 platform fields and status to camelCase', async () => {
    getMock.mockResolvedValueOnce({ data: { success: true, data: {
      kit: {
        id: 'k1', user_id: 'u1', generation_request_id: 'r1', video_upload_id: null,
        title: 'T', content_linkedin: 'LI', content_twitter: 'TW', content_instagram: 'IG',
        content_blog: 'BLOG', content_email: 'EM', content_tiktok: 'TT', content_youtube: 'YT',
        content_video_script: 'SCRIPT', carousel_status: 'pending', clips_status: 'none',
        knowledge_base_id: 'kb1', input_type: 'text', created_at: 'c', updated_at: 'up',
      },
      upload: null, clips: [], carousel: null, reelContent: null,
    } } });

    const res = await api.contentKits.get('k1');
    const kit = res.data.kit as any;
    expect(kit.contentLinkedin).toBe('LI');
    expect(kit.contentTwitter).toBe('TW');
    expect(kit.contentInstagram).toBe('IG');
    expect(kit.contentEmail).toBe('EM');
    expect(kit.contentTiktok).toBe('TT');
    expect(kit.contentYoutube).toBe('YT');
    expect(kit.contentBlog).toBe('BLOG');
    expect(kit.contentVideoScript).toBe('SCRIPT');
    expect(kit.carouselStatus).toBe('pending');
    expect(kit.clipsStatus).toBe('none');
    expect(kit.generationRequestId).toBe('r1');
  });
});
