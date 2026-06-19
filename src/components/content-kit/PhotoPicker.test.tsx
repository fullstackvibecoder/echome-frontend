import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoPicker } from './PhotoPicker';

const listCarouselPhotos = vi.fn();
const hideCarouselPhoto = vi.fn();
const saveCarouselPhoto = vi.fn();
const getForContentKit = vi.fn();
const getForUpload = vi.fn();
const getProfile = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    images: {
      listCarouselPhotos: (...a: unknown[]) => listCarouselPhotos(...a),
      hideCarouselPhoto: (...a: unknown[]) => hideCarouselPhoto(...a),
      saveCarouselPhoto: (...a: unknown[]) => saveCarouselPhoto(...a),
    },
    snapshots: {
      getForContentKit: (...a: unknown[]) => getForContentKit(...a),
      getForUpload: (...a: unknown[]) => getForUpload(...a),
    },
    auth: {
      getProfile: (...a: unknown[]) => getProfile(...a),
    },
  },
}));

// Real required props: kitId, onSelect. uploadId and currentPhotoUrl are optional.
const baseProps = { kitId: 'kit-1', onSelect: vi.fn() };

describe('PhotoPicker library photos', () => {
  beforeEach(() => {
    listCarouselPhotos.mockReset();
    hideCarouselPhoto.mockReset();
    saveCarouselPhoto.mockReset();
    getForContentKit.mockReset();
    getForUpload.mockReset();
    getProfile.mockReset();

    // Default: no snapshots, no profile image — keeps tests focused on library.
    getForContentKit.mockResolvedValue({ success: true, data: { snapshots: [] } });
    getProfile.mockResolvedValue({ success: false });
  });

  it('renders saved library photos fetched on mount', async () => {
    listCarouselPhotos.mockResolvedValue({
      success: true,
      data: {
        photos: [{ id: 'p1', url: 'https://example.com/p1.jpg', original_filename: 'beach.jpg', created_at: 't' }],
      },
    });

    render(<PhotoPicker {...baseProps} />);

    await waitFor(() =>
      expect(screen.getByAltText(/beach\.jpg/i)).toBeInTheDocument(),
    );
  });

  it('hides a library photo on confirm and removes it from the list', async () => {
    listCarouselPhotos.mockResolvedValue({
      success: true,
      data: {
        photos: [{ id: 'p1', url: 'https://example.com/p1.jpg', original_filename: 'beach.jpg', created_at: 't' }],
      },
    });
    hideCarouselPhoto.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PhotoPicker {...baseProps} />);
    const img = await screen.findByAltText(/beach\.jpg/i);

    await userEvent.click(screen.getByRole('button', { name: /remove saved photo/i }));

    await waitFor(() => expect(hideCarouselPhoto).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(img).not.toBeInTheDocument());
  });
});
