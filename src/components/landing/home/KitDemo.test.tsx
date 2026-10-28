import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KitDemo, deriveFrame } from './KitDemo';
import { PERSONAS, PHASE } from './kitDemoData';

const coach = PERSONAS[0];

describe('deriveFrame', () => {
  it('starts recording with no words, no kit and an empty week', () => {
    const f = deriveFrame(coach, 0);
    expect(f.stage).toBe('Recording');
    expect(f.clock).toBe('0:00');
    expect(f.runs.every((r) => r.shown === '')).toBe(true);
    expect(f.kit.every((k) => k.appear === 0)).toBe(true);
    expect(f.week.flatMap((d) => d.items).every((i) => i.appear === 0)).toBe(true);
  });

  it('has revealed every word and the full source length when recording ends', () => {
    const f = deriveFrame(coach, PHASE.recordEnd);
    expect(f.runs.map((r) => r.shown).join('')).toBe(coach.transcript.map((r) => r.text).join(''));
    expect(f.clock).toBe('20:26');
    expect(f.stage).toBe('Finding moments');
  });

  it('highlights the clip lines in order', () => {
    const mid = PHASE.highlightStart + PHASE.highlightStep + PHASE.highlightLength / 2;
    const clips = deriveFrame(coach, mid).runs.filter((r) => r.clip);
    expect(clips[0].highlight).toBe(1);
    expect(clips[1].highlight).toBeGreaterThan(0);
    expect(clips[1].highlight).toBeLessThan(1);
    expect(clips[2].highlight).toBe(0);
  });

  it('ends with 3 clips + 2 extras, all scheduled across the week', () => {
    const f = deriveFrame(coach, 1);
    expect(f.stage).toBe('Scheduled');
    expect(f.kit.map((k) => k.label)).toEqual(['Clip 1', 'Clip 2', 'Clip 3', 'Instagram caption', 'Instagram caption']);
    expect(f.kit[0].body).toBe('I’m 21, I look like I’m 16.');
    const scheduled = f.week.flatMap((d) => d.items);
    expect(scheduled).toHaveLength(5);
    expect(scheduled.every((i) => i.appear === 1)).toBe(true);
  });

  it('clamps t past the loop hold', () => {
    expect(deriveFrame(coach, 1.35)).toEqual(deriveFrame(coach, 1));
  });
});

describe('KitDemo', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      } as unknown as typeof IntersectionObserver,
    );
  });

  it('first paint shows the finished week, so content never depends on JS', () => {
    render(<KitDemo />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    const kit = screen.getByRole('list', { name: 'Your kit' });
    expect(within(kit).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Play demo' })).toBeInTheDocument();
  });

  it('exposes the full real transcript to screen readers', () => {
    render(<KitDemo />);
    expect(screen.getByText(/prospecting for my PJs/, { selector: 'p.sr-only' })).toBeInTheDocument();
  });

  it('switches persona and labels samples as samples', async () => {
    render(<KitDemo />);
    expect(screen.getByRole('button', { name: 'Coach' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Real estate agent' }));
    expect(screen.getByRole('button', { name: 'Real estate agent' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/^Sample recording/)).toBeInTheDocument();
  });

  it('scrubbing pauses the demo', async () => {
    render(<KitDemo />);
    const scrub = screen.getByLabelText('Scrub the demo');
    await userEvent.click(screen.getByRole('button', { name: 'Play demo' }));
    expect(screen.getByRole('button', { name: 'Pause demo' })).toBeInTheDocument();
    // jsdom doesn't move range inputs on arrow keys, so fire the change directly.
    fireEvent.change(scrub, { target: { value: '200' } });
    expect(screen.getByRole('button', { name: 'Play demo' })).toBeInTheDocument();
  });
});
