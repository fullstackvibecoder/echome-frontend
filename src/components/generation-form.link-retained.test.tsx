import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GenerationForm } from './generation-form';
import { api } from '@/lib/api-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isSubscribed: true, isTrial: false, isFreeUser: false, freeGenerationsUsed: 0, freeGenerationsLimit: 0, freeGenerationsRemaining: 0, canGenerate: true, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
vi.mock('@/hooks/useEchoExperience', () => ({ useEchoExperience: () => false }));
vi.mock('@/hooks/useGenerationProgress', () => ({ useGenerationProgress: () => ({ progress: null, isComplete: false, hasError: false }), isVideoStep: () => false }));
vi.mock('./generation-banner', () => ({ setActiveGeneration: vi.fn(), useActiveGeneration: () => ({ activeGeneration: null }) }));
vi.mock('@/lib/toast', () => ({ showErrorToast: vi.fn(), showSuccessToast: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ track: vi.fn() }));
vi.mock('@/components/echo/file-handoff', () => ({ takeEchoHandoff: () => null }));
vi.mock('@/lib/api-client', () => ({
  api: {
    clips: { upload: vi.fn(), process: vi.fn(), get: vi.fn() },
    generation: {}, music: {}, reels: {},
  },
}));

describe('GenerationForm link submit failure', () => {
  it('puts the pasted link back in the input when the submit fails', async () => {
    vi.mocked(api.clips.upload).mockRejectedValue(new Error('network down'));
    render(<GenerationForm onGenerate={vi.fn()} generating={false} echoExperience={false} />);

    const link = 'https://www.youtube.com/watch?v=abc123';
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: link } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() => expect(api.clips.upload).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(link));
  });
});
