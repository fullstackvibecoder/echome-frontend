import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('calls saveCarouselPhoto with the selected file on upload', async () => {
    listCarouselPhotos.mockResolvedValue({ success: true, data: { photos: [] } });
    saveCarouselPhoto.mockResolvedValue({
      success: true,
      data: { photo: { id: 'new1', url: 'https://x/new1.jpg' } },
    });

    const onSelect = vi.fn();
    render(<PhotoPicker {...baseProps} onSelect={onSelect} />);

    // Wait for loading to finish so the file input is in the DOM.
    await waitFor(() => expect(screen.getByRole('button', { name: /upload your own photo/i })).toBeInTheDocument());

    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(saveCarouselPhoto).toHaveBeenCalledWith(file));
    expect(onSelect).toHaveBeenCalledWith('https://x/new1.jpg');
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
