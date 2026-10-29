import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KitDemo, deriveFrame, mmss } from './KitDemo';
import { DEMO, PHASE } from './kitDemoData';

const persona = DEMO;

describe('demo data', () => {
  it('has 5 clips of 30-90s inside a 5+ minute recording', () => {
    const p = DEMO;
    expect(p.clips).toHaveLength(5);
    expect(p.source.seconds).toBeGreaterThanOrEqual(300);
    for (const c of p.clips) {
      expect(c.end - c.start).toBeGreaterThanOrEqual(30);
      expect(c.end - c.start).toBeLessThanOrEqual(90);
      expect(c.end).toBeLessThanOrEqual(p.source.seconds);
    }
  });
});

describe('deriveFrame', () => {
  it('starts with the tape empty, no brackets, and an empty week', () => {
    const f = deriveFrame(persona, 0);
    expect(f.clock).toBe('0:00');
    expect(f.panel).toBe('live');
    expect(f.brackets.every((b) => b.draw === 0)).toBe(true);
    expect(f.kit.every((k) => k.fly === 0 && k.drop === 0)).toBe(true);
    expect(f.week.every((d) => !d.landed)).toBe(true);
  });

  it('has played the whole recording when recording ends', () => {
    const f = deriveFrame(persona, PHASE.recordEnd);
    expect(f.clock).toBe(mmss(persona.source.seconds));
    expect(f.stage).toBe('Finding clips');
  });

  it('brackets the clips one at a time, in order', () => {
    const f = deriveFrame(persona, PHASE.bracketStart + PHASE.bracketStep + PHASE.bracketLength / 2);
    expect(f.panel).toBe('bracket');
    expect(f.focus).toBe(1);
    expect(f.brackets[0].draw).toBe(1);
    expect(f.brackets[1].draw).toBeGreaterThan(0);
    expect(f.brackets[1].draw).toBeLessThan(1);
    expect(f.brackets[2].draw).toBe(0);
  });

  it('ends with 5 clips + 2 extras across all 7 days', () => {
    const f = deriveFrame(persona, 1);
    expect(f.stage).toBe('Scheduled');
    expect(f.panel).toBe('summary');
    expect(f.kit.map((k) => k.label)).toEqual(['Clip 1', 'Clip 2', 'Clip 3', 'Clip 4', 'Clip 5', ...persona.extras.map((e) => e.label)]);
    expect(f.week.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(f.week.every((d) => d.landed)).toBe(true);
    expect(new Set(f.week.map((d) => d.ref)).size).toBe(7);
  });

  it('clamps t past the loop hold', () => {
    expect(deriveFrame(persona, 1.3)).toEqual(deriveFrame(persona, 1));
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
    const week = screen.getByRole('list', { name: 'Scheduled week' });
    expect(within(week).getAllByRole('listitem')).toHaveLength(7);
    const first = persona.clips[0];
    expect(within(week).getByText(new RegExp(`Clip 1, ${mmss(first.end - first.start)}`))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play demo' })).toBeInTheDocument();
  });

  it('tells screen readers how long the recording and each clip are', () => {
    render(<KitDemo />);
    expect(screen.getByText(new RegExp(`${mmss(persona.source.seconds)} long\\. Echo cut 5 clips`))).toBeInTheDocument();
  });

  it('shows one real person, with no persona switcher', () => {
    render(<KitDemo />);
    expect(screen.getByText(DEMO.who)).toBeInTheDocument();
    expect(screen.getByText(DEMO.note)).toBeInTheDocument();
    expect(screen.getByText(/A full week\. From one video she’d already made\./)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Show an example for' })).not.toBeInTheDocument();
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
