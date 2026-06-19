import { describe, it, expect, vi, beforeEach } from 'vitest';

const { post, get, del } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      post, get, delete: del,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}));

// Imported after the mock so apiClient is built on the mocked axios.
import { api } from './api-client';

describe('api.images carousel photos', () => {
  beforeEach(() => { post.mockReset(); get.mockReset(); del.mockReset(); });

  it('saveCarouselPhoto posts multipart to /images/carousel-photos', async () => {
    post.mockResolvedValue({ data: { success: true, data: { photo: { id: 'p1', url: 'https://x/p1.jpg' } } } });
    const file = new File([new Uint8Array([1, 2, 3])], 'x.jpg', { type: 'image/jpeg' });

    const out = await api.images.saveCarouselPhoto(file);

    expect(post).toHaveBeenCalledWith(
      '/images/carousel-photos',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(out.data?.photo.id).toBe('p1');
  });

  it('listCarouselPhotos gets /images/carousel-photos', async () => {
    get.mockResolvedValue({ data: { success: true, data: { photos: [{ id: 'p1', url: 'u', original_filename: null, created_at: 't' }] } } });
    const out = await api.images.listCarouselPhotos();
    expect(get).toHaveBeenCalledWith('/images/carousel-photos');
    expect(out.data?.photos).toHaveLength(1);
  });

  it('hideCarouselPhoto deletes /images/carousel-photos/:id', async () => {
    del.mockResolvedValue({ status: 204 });
    await api.images.hideCarouselPhoto('p1');
    expect(del).toHaveBeenCalledWith('/images/carousel-photos/p1');
  });
});
