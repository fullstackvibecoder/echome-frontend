import { describe, it, expect } from 'vitest';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/types/advisor';

describe('advisor dimension constants', () => {
  it('has six dimensions with labels', () => {
    expect(DIMENSION_KEYS).toHaveLength(6);
    for (const k of DIMENSION_KEYS) {
      expect(DIMENSION_LABELS[k].length).toBeGreaterThan(0);
    }
  });

  it('includes voice and relationships', () => {
    expect(DIMENSION_KEYS).toContain('voice');
    expect(DIMENSION_KEYS).toContain('relationships');
  });
});
