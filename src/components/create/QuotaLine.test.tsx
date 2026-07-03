import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuotaLine } from './QuotaLine';

describe('QuotaLine', () => {
  it('shows remaining count with Upgrade link', () => {
    render(<QuotaLine remaining={3} limit={5} />);
    expect(screen.getByText('3 of 5 free content kits left')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Upgrade' });
    expect(link).toHaveAttribute('href', '/app/billing');
  });

  it('flips to amber Subscribe on the last kit', () => {
    render(<QuotaLine remaining={1} limit={5} />);
    expect(screen.getByText('Last free content kit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', '/app/billing');
  });

  it('shows exhausted copy at zero', () => {
    render(<QuotaLine remaining={0} limit={5} />);
    expect(screen.getByText('Free content kits used up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade' })).toBeInTheDocument();
  });
});
