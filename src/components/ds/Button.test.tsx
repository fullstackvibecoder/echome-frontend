import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowUp } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';

describe('Button', () => {
  it('renders children and defaults to type=button', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('primary uses the gradient, secondary does not', () => {
    render(
      <>
        <Button variant="primary">P</Button>
        <Button>S</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'P' })).toHaveClass('je-grad');
    expect(screen.getByRole('button', { name: 'S' })).not.toHaveClass('je-grad');
  });

  it('loading disables, sets aria-busy and blocks clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('has an accessible name and a decorative 1.7 stroke icon', () => {
    render(<IconButton label="Send" icon={ArrowUp} />);
    const btn = screen.getByRole('button', { name: 'Send' });
    const svg = btn.querySelector('svg')!;
    expect(svg).toHaveAttribute('stroke-width', '1.7');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('grad variant uses the gradient', () => {
    render(<IconButton label="Send" icon={ArrowUp} variant="grad" />);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveClass('je-grad');
  });
});
