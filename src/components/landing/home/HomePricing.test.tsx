import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { HomePricing } from './HomePricing';

// Guards the restyle: prices and plan links must match what billing expects.
describe('HomePricing', () => {
  const link = (name: string) => screen.getByRole('link', { name });

  it('shows monthly prices and plan signup links', () => {
    render(<HomePricing />);
    for (const price of ['$0', '$37', '$87', '$94']) expect(screen.getByText(price)).toBeInTheDocument();
    expect(link('Start Free')).toHaveAttribute('href', '/auth/signup');
    expect(link('Try Echo Free')).toHaveAttribute('href', '/auth/signup?plan=echo');
    expect(link('Try Studio Free')).toHaveAttribute('href', '/auth/signup?plan=echo-studio');
    expect(link('Try Echo Teams Free')).toHaveAttribute('href', '/auth/signup?plan=echo-teams&voices=2');
    expect(link('Contact Sales')).toHaveAttribute('href', 'mailto:enterprise@tryechome.com');
  });

  it('switches to annual prices', async () => {
    render(<HomePricing />);
    await userEvent.click(screen.getByRole('button', { name: 'Annual, save 17%' }));
    for (const price of ['$370', '$870', '$940']) expect(screen.getByText(price)).toBeInTheDocument();
    expect(screen.getAllByText('2 months free')).toHaveLength(3);
  });

  it('prices Echo Teams per voice, minimum 2', async () => {
    render(<HomePricing />);
    expect(screen.getByRole('button', { name: 'Decrease voice count' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Increase voice count' }));
    expect(screen.getByText('$141')).toBeInTheDocument();
    expect(link('Try Echo Teams Free')).toHaveAttribute('href', '/auth/signup?plan=echo-teams&voices=3');
  });
});
