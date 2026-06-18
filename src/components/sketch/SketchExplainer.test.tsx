import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SketchExplainer } from './SketchExplainer';

describe('SketchExplainer hero-transform scene', () => {
  it('renders an accessible svg for the hero-transform scene', () => {
    render(<SketchExplainer scene="hero-transform" accent="#6FC3EC" />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
    expect(img).toHaveAttribute('aria-label');
    expect(img.getAttribute('aria-label')!.length).toBeGreaterThan(10);
  });

  it('applies the accent color to the scene strokes', () => {
    const { container } = render(
      <SketchExplainer scene="hero-transform" accent="#6FC3EC" />,
    );
    // The scoped <style> tag carries the accent in the .stroke rule.
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('#6FC3EC');
  });
});
