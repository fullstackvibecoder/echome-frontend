import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { linkify } from './linkify';

describe('linkify', () => {
  it('linkify links https urls and /app paths only', () => {
    const { container } = render(
      <p>{linkify('See https://example.com/a and /app/library/1 but not http://x.com or www.y.com or /etc/passwd')}</p>,
    );
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['https://example.com/a', '/app/library/1']);
    expect(container.textContent).toContain('http://x.com');
  });

  it('keeps trailing punctuation outside the link', () => {
    const { container } = render(<p>{linkify('Go to https://example.com/a.')}</p>);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/a');
    expect(container.textContent).toBe('Go to https://example.com/a.');
  });
});
