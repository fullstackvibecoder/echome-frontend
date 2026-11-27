import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepBar } from './StepBar';
import { ProgressWave } from './ProgressWave';

const STEPS = ['Upload', 'Transcribe', 'Find moments', 'Captions'];
const states = (c: HTMLElement) => Array.from(c.querySelectorAll('li')).map((l) => l.getAttribute('data-state'));

describe('StepBar', () => {
  it('marks done, now, todo and aria-current', () => {
    const { container } = render(<StepBar steps={STEPS} current={2} />);
    expect(states(container)).toEqual(['done', 'done', 'now', 'todo']);
    const items = container.querySelectorAll('li');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(1);
    for (const s of STEPS) expect(screen.getByText(s)).toBeVisible();
    expect(screen.getByRole('list', { name: 'Progress' })).toBeInTheDocument();
  });

  it('treats current past the end as all done', () => {
    const { container } = render(<StepBar steps={STEPS} current={9} />);
    expect(states(container)).toEqual(['done', 'done', 'done', 'done']);
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('clamps negative current to the first step', () => {
    const { container } = render(<StepBar steps={STEPS} current={-1} />);
    expect(states(container)[0]).toBe('now');
  });

  it('floors a fractional current', () => {
    const { container } = render(<StepBar steps={STEPS} current={1.9} />);
    expect(states(container)).toEqual(['done', 'now', 'todo', 'todo']);
  });

  it('treats NaN current as the first step', () => {
    const { container } = render(<StepBar steps={STEPS} current={NaN} />);
    expect(states(container)).toEqual(['now', 'todo', 'todo', 'todo']);
  });

  it('exposes done steps to screen readers', () => {
    const { container } = render(<StepBar steps={STEPS} current={2} />);
    const done = container.querySelectorAll('li[data-state="done"] .je-sr-only');
    expect(done).toHaveLength(2);
    expect(done[0].textContent).toBe('done');
  });

  it('renders nothing for no steps', () => {
    const { container } = render(<StepBar steps={[]} current={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ProgressWave', () => {
  it('is decorative, clamps heights and marks valid hits', () => {
    const { container } = render(<ProgressWave bars={[0.5, 2, -1, NaN]} hits={[1, 7]} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    const bars = container.querySelectorAll('i');
    expect(bars).toHaveLength(4);
    expect(Array.from(bars).map((b) => (b as HTMLElement).style.height)).toEqual(['50%', '100%', '8%', '8%']);
    const hits = container.querySelectorAll('[data-hit="true"]');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toBe(bars[1]);
  });

  it('renders the scan line only when scanning', () => {
    const { container, rerender } = render(<ProgressWave bars={[0.5]} scanning />);
    expect(container.querySelector('[data-scan]')).not.toBeNull();
    rerender(<ProgressWave bars={[0.5]} />);
    expect(container.querySelector('[data-scan]')).toBeNull();
  });

  it('hides the scan line under reduced motion', () => {
    const { container } = render(<ProgressWave bars={[0.5]} scanning />);
    expect(container.querySelector('[data-scan]')!.className).toContain('motion-reduce:hidden');
  });

  it('renders nothing for empty bars', () => {
    const { container } = render(<ProgressWave bars={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
