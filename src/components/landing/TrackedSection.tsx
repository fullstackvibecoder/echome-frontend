'use client';

import type { ReactNode } from 'react';
import { useSectionView } from './useSectionView';

/** Wraps a landing section to emit a one-shot section_view event in view. */
export function TrackedSection({ name, children }: { name: string; children: ReactNode }) {
  const ref = useSectionView<HTMLDivElement>(name);
  return (
    <div ref={ref} data-section={name}>
      {children}
    </div>
  );
}
