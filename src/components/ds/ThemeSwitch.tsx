'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useThemePref } from '@/hooks/useThemePref';
import type { ThemePref } from '@/lib/theme';
import { cx } from './cx';

const OPTIONS: Array<{ value: ThemePref; label: string; Icon: LucideIcon }> = [
  { value: 'system', label: 'Auto', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeSwitch({ className }: { className?: string }) {
  const { pref, setPref } = useThemePref();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % OPTIONS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + OPTIONS.length) % OPTIONS.length;
    else return;
    e.preventDefault();
    setPref(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cx('inline-flex items-center gap-0.5 rounded-[8px] border border-je-hair p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, Icon }, i) => {
        const selected = pref === value;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-label={label}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setPref(value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'flex h-[26px] w-[26px] items-center justify-center rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]',
              selected ? 'bg-je-tint text-je-ink' : 'text-je-muted',
            )}
          >
            <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
