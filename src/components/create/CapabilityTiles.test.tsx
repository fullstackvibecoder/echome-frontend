import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapabilityTiles, CAPABILITIES } from './CapabilityTiles';

describe('CapabilityTiles', () => {
  it('renders one tile per capability', () => {
    render(<CapabilityTiles onSelect={() => {}} />);
    for (const cap of CAPABILITIES) {
      expect(screen.getByRole('button', { name: new RegExp(cap.title, 'i') })).toBeInTheDocument();
    }
  });

  it('calls onSelect with the prefill text on click', async () => {
    const onSelect = vi.fn();
    render(<CapabilityTiles onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(CAPABILITIES[0].title, 'i') }));
    expect(onSelect).toHaveBeenCalledWith(CAPABILITIES[0].prefill);
  });
});
