import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UseCasesSection } from './UseCasesSection';

describe('UseCasesSection', () => {
  it('renders the four persona cards', () => {
    render(<UseCasesSection />);
    expect(screen.getByText('Podcaster')).toBeInTheDocument();
    expect(screen.getByText('Real Estate Agent')).toBeInTheDocument();
    expect(screen.getByText('Course Creator')).toBeInTheDocument();
    expect(screen.getByText('Consultant')).toBeInTheDocument();
  });

  it('uses a dark section background, not the old light bg-white', () => {
    const { container } = render(<UseCasesSection />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.className).toContain('bg-gray-900');
    expect(section!.className).not.toContain('bg-white');
  });
});
