import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Row } from './Row';
import { Tile } from './Tile';
import { Meter } from './Meter';

describe('Row', () => {
  it('renders a button when onClick is given', () => {
    render(<Row title="Item" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeTruthy();
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('renders a link when href is given', () => {
    render(<Row title="Item" href="/x" />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/x');
  });

  it('renders neither button nor link by default', () => {
    render(<Row title="Item" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('marks selected rows with aria-current', () => {
    render(<Row title="Item" selected />);
    expect(screen.getByText('Item').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
  });

  it('truncates the title and renders lead, detail and trail', () => {
    render(<Row lead={<i>L</i>} title="Item" detail="Det" trail={<b>T</b>} />);
    expect(screen.getByText('Item').className).toContain('truncate');
    expect(screen.getByText('Det').className).toContain('truncate');
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('T')).toBeTruthy();
  });
});

describe('Tile', () => {
  it('is a button named by its action and fires onClick', () => {
    const onClick = vi.fn();
    render(<Tile picture={<div />} action="Clip my latest video" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clip my latest video' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is a link when href is given', () => {
    render(<Tile picture={<div />} action="Go" href="/go" />);
    expect(screen.getByRole('link', { name: 'Go' }).getAttribute('href')).toBe('/go');
  });
});

describe('Meter', () => {
  it('renders segments for small totals', () => {
    const { container } = render(<Meter value={4} total={7} label="Days covered" />);
    const m = screen.getByRole('meter', { name: 'Days covered' });
    expect(m.getAttribute('aria-valuenow')).toBe('4');
    expect(m.getAttribute('aria-valuemax')).toBe('7');
    expect(m.getAttribute('aria-valuemin')).toBe('0');
    expect(screen.getByText('4/7')).toBeTruthy();
    expect(container.querySelectorAll('[data-filled]').length).toBe(7);
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(4);
  });

  it('clamps value above total', () => {
    render(<Meter value={9} total={7} label="x" />);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('7');
    expect(screen.getByText('7/7')).toBeTruthy();
  });

  it('clamps negative value to 0', () => {
    render(<Meter value={-2} total={7} label="x" />);
    expect(screen.getByText('0/7')).toBeTruthy();
  });

  it('renders nothing for invalid totals', () => {
    const a = render(<Meter value={1} total={0} label="x" />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<Meter value={1} total={NaN} label="x" />);
    expect(b.container.firstChild).toBeNull();
  });

  it('renders nothing when the floored total is 0', () => {
    const { container } = render(<Meter value={0} total={0.5} label="x" />);
    expect(container.firstChild).toBeNull();
  });

  it('segments at 14 and goes continuous at 15', () => {
    const a = render(<Meter value={3} total={14} label="x" />);
    expect(a.container.querySelectorAll('[data-filled]').length).toBe(14);
    a.unmount();
    const b = render(<Meter value={3} total={15} label="x" />);
    expect(b.container.querySelectorAll('[data-filled]').length).toBe(2);
  });

  it('exposes aria-valuetext', () => {
    render(<Meter value={4} total={7} label="x" />);
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toBe('4 of 7');
  });

  it('renders one continuous bar for large totals', () => {
    const { container } = render(<Meter value={12} total={30} label="x" />);
    expect(screen.getByText('12/30')).toBeTruthy();
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(1);
    expect(container.querySelectorAll('[data-filled]').length).toBe(2);
  });
});

describe('Tile overflow', () => {
  it('truncates a long action', () => {
    render(<Tile picture={<i />} action="A very long action label that should not overflow" />);
    expect(screen.getByText(/A very long action/).className).toContain('truncate');
  });
});
