import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceStrengthStrip } from './VoiceStrengthStrip';
import type { Coverage } from '@/types/advisor';

const strengthMock = vi.fn();
vi.mock('@/hooks/useVoiceStrength', () => ({
  useVoiceStrength: () => strengthMock(),
}));
const outcomeMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { wbtw: { outcome: () => outcomeMock() } },
}));

const COVERAGE: Coverage = {
  work: { covered: true, strength: 0.9, sampleCount: 5 },
  industry: { covered: true, strength: 0.7, sampleCount: 3 },
  interests: { covered: false, strength: 0.2, sampleCount: 1 },
  personal: { covered: false, strength: 0.1, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: true, strength: 0.8, sampleCount: 10 },
};

describe('VoiceStrengthStrip', () => {
  beforeEach(() => {
    strengthMock.mockReset();
    outcomeMock.mockReset();
    outcomeMock.mockResolvedValue({ outcome: 'done' });
  });

  it('shows tier label from the strength score', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 62 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(screen.getByText('Voice profile: Strong')).toBeInTheDocument();
  });

  it('links the tier area to /app/voice and carries the tour anchor', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 80 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    const link = screen.getByRole('link', { name: /voice profile/i });
    expect(link).toHaveAttribute('href', '/app/voice');
    expect(link).toHaveAttribute('data-tour', 'echo-hero-voice');
  });

  it('renders a coverage subline naming strongest and thinnest areas', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(screen.getByText(/Strongest: Work, Voice/)).toBeInTheDocument();
    expect(screen.getByText(/Thinnest: Personal/)).toBeInTheDocument();
  });

  it('omits the subline without coverage', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    render(<VoiceStrengthStrip coverage={null} onTeachMore={vi.fn()} />);
    expect(screen.queryByText(/Strongest:/)).not.toBeInTheDocument();
  });

  it('Teach Echo more calls onTeachMore', async () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    const onTeachMore = vi.fn();
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={onTeachMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Teach Echo more' }));
    expect(onTeachMore).toHaveBeenCalledOnce();
  });

  it('shows learning state while WBTW is pending and no score exists', async () => {
    strengthMock.mockReturnValue({ data: null });
    outcomeMock.mockResolvedValue({ outcome: 'pending' });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(await screen.findByText('Learning your voice...')).toBeInTheDocument();
  });
});
