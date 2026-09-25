import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipTrimControls } from './ClipTrimControls';

const trim = vi.fn();
const resetTrim = vi.fn();
const getTrimStatus = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    clips: {
      trim: (...a: unknown[]) => trim(...a),
      resetTrim: (...a: unknown[]) => resetTrim(...a),
      getTrimStatus: (...a: unknown[]) => getTrimStatus(...a),
    },
  },
}));

const baseProps = {
  uploadId: 'upload-1',
  clipId: 'clip-1',
  startTime: 10,
  endTime: 20,
  originalStartTime: 0,
  originalEndTime: 30,
  isTrimmed: false,
  trimStatus: 'idle' as const,
  videoRef: { current: null } as React.RefObject<HTMLVideoElement | null>,
  onTrimApplied: vi.fn(),
};

function getSlider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

describe('ClipTrimControls', () => {
  beforeEach(() => {
    trim.mockReset();
    resetTrim.mockReset();
    getTrimStatus.mockReset();
    baseProps.onTrimApplied.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('places the handles at the current bounds on mount', () => {
    render(<ClipTrimControls {...baseProps} />);
    expect(getSlider(/trim in point/i)).toHaveAttribute('aria-valuenow', '10');
    expect(getSlider(/trim out point/i)).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByText('In 0:10.0')).toBeInTheDocument();
    expect(screen.getByText('Out 0:20.0')).toBeInTheDocument();
  });

  it('clamps the in handle to originalStartTime via the keyboard', () => {
    render(<ClipTrimControls {...baseProps} />);
    const inHandle = getSlider(/trim in point/i);
    for (let i = 0; i < 200; i++) {
      fireEvent.keyDown(inHandle, { key: 'ArrowLeft', shiftKey: true });
    }
    expect(getSlider(/trim in point/i)).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps the out handle to originalEndTime via the keyboard', () => {
    render(<ClipTrimControls {...baseProps} />);
    const outHandle = getSlider(/trim out point/i);
    for (let i = 0; i < 200; i++) {
      fireEvent.keyDown(outHandle, { key: 'ArrowRight', shiftKey: true });
    }
    expect(getSlider(/trim out point/i)).toHaveAttribute('aria-valuenow', '30');
  });

  it('clamps dragging the out handle to a 3s minimum from the in handle and warns', () => {
    render(<ClipTrimControls {...baseProps} startTime={10} endTime={11.5} />);
    const outHandle = getSlider(/trim out point/i);
    fireEvent.keyDown(outHandle, { key: 'ArrowLeft', shiftKey: true }); // try to push out below in+3
    expect(getSlider(/trim out point/i)).toHaveAttribute('aria-valuenow', '13');
    expect(screen.getByText(/at least 3 seconds/i)).toBeInTheDocument();
  });

  it('clicking a word before the range midpoint sets In; after sets Out', () => {
    const words = [
      { text: 'alpha', start: 1, end: 2 },
      { text: 'beta', start: 25, end: 26 },
    ];
    render(<ClipTrimControls {...baseProps} transcriptWords={words} />);
    fireEvent.click(screen.getByText('alpha'));
    expect(getSlider(/trim in point/i)).toHaveAttribute('aria-valuenow', '1');
    fireEvent.click(screen.getByText('beta'));
    expect(getSlider(/trim out point/i)).toHaveAttribute('aria-valuenow', '26');
  });

  it('disables Apply trim when the bounds are unchanged', () => {
    render(<ClipTrimControls {...baseProps} />);
    expect(screen.getByRole('button', { name: /apply trim/i })).toBeDisabled();
  });

  it('enables Apply trim once a handle moves, POSTs the new bounds, polls, and reports idle with media', async () => {
    vi.useFakeTimers();
    trim.mockResolvedValue({ success: true, data: { clipId: 'clip-1', trimStatus: 'processing' } });
    getTrimStatus
      .mockResolvedValueOnce({
        success: true,
        data: {
          trimStatus: 'processing',
          trimError: null,
          startTime: 10,
          endTime: 20,
          originalStartTime: 0,
          originalEndTime: 30,
          duration: 10,
          isTrimmed: false,
          trimNotes: null,
          media: { url: 'https://cdn.example.com/old.mp4', thumbnailUrl: null },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          trimStatus: 'idle',
          trimError: null,
          startTime: 12,
          endTime: 20,
          originalStartTime: 0,
          originalEndTime: 30,
          duration: 8,
          isTrimmed: true,
          trimNotes: null,
          media: { url: 'https://cdn.example.com/new.mp4', thumbnailUrl: 'https://cdn.example.com/new.jpg' },
        },
      });

    render(<ClipTrimControls {...baseProps} />);
    const inHandle = getSlider(/trim in point/i);
    fireEvent.keyDown(inHandle, { key: 'ArrowRight', shiftKey: true }); // 10 -> 11

    const applyButton = screen.getByRole('button', { name: /apply trim/i });
    expect(applyButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(applyButton);
    });
    expect(trim).toHaveBeenCalledWith('upload-1', 'clip-1', { startTime: 11, endTime: 20 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(getTrimStatus).toHaveBeenCalledTimes(1);
    expect(baseProps.onTrimApplied).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(getTrimStatus).toHaveBeenCalledTimes(2);
    expect(baseProps.onTrimApplied).toHaveBeenCalledWith(
      { url: 'https://cdn.example.com/new.mp4', thumbnailUrl: 'https://cdn.example.com/new.jpg' },
      { startTime: 12, endTime: 20 },
    );
    expect(screen.getByText(/trim applied/i)).toBeInTheDocument();
  });

  it('shows the server error inline when the trim job fails', async () => {
    vi.useFakeTimers();
    trim.mockResolvedValue({ success: true, data: { clipId: 'clip-1', trimStatus: 'processing' } });
    getTrimStatus.mockResolvedValue({
      success: true,
      data: {
        trimStatus: 'failed',
        trimError: 'ffmpeg exited with code 1',
        startTime: 10,
        endTime: 20,
        originalStartTime: 0,
        originalEndTime: 30,
        duration: 10,
        isTrimmed: false,
        trimNotes: null,
        media: { url: 'https://cdn.example.com/old.mp4', thumbnailUrl: null },
      },
    });

    render(<ClipTrimControls {...baseProps} />);
    fireEvent.keyDown(getSlider(/trim in point/i), { key: 'ArrowRight', shiftKey: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /apply trim/i }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(screen.getByText('ffmpeg exited with code 1')).toBeInTheDocument();
    expect(baseProps.onTrimApplied).not.toHaveBeenCalled();
  });

  it('only shows Reset to original when the clip is trimmed', () => {
    const { rerender } = render(<ClipTrimControls {...baseProps} isTrimmed={false} />);
    expect(screen.queryByRole('button', { name: /reset to original/i })).not.toBeInTheDocument();

    rerender(<ClipTrimControls {...baseProps} isTrimmed={true} clipId="clip-2" />);
    expect(screen.getByRole('button', { name: /reset to original/i })).toBeInTheDocument();
  });

  it('stops polling when the component unmounts', async () => {
    vi.useFakeTimers();
    trim.mockResolvedValue({ success: true, data: { clipId: 'clip-1', trimStatus: 'processing' } });
    getTrimStatus.mockResolvedValue({
      success: true,
      data: {
        trimStatus: 'processing',
        trimError: null,
        startTime: 10,
        endTime: 20,
        originalStartTime: 0,
        originalEndTime: 30,
        duration: 10,
        isTrimmed: false,
        trimNotes: null,
        media: { url: 'https://cdn.example.com/old.mp4', thumbnailUrl: null },
      },
    });

    const { unmount } = render(<ClipTrimControls {...baseProps} />);
    fireEvent.keyDown(getSlider(/trim in point/i), { key: 'ArrowRight', shiftKey: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /apply trim/i }));
    });

    unmount();
    const callsBeforeAdvance = getTrimStatus.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(getTrimStatus.mock.calls.length).toBe(callsBeforeAdvance);
  });
});
