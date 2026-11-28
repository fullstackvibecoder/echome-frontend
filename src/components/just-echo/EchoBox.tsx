'use client';

import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { IconButton } from '@/components/ds/IconButton';

const LINE_PX = 22;
const MAX_LINES = 6;

export type EchoBoxProps = {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder: string;
  autoFocus?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Lets a parent focus the box (for example after a suggestion tile fills it). */
  inputRef?: RefObject<HTMLTextAreaElement | null>;
};

export function EchoBox({ onSend, disabled, placeholder, autoFocus, value, onChange, inputRef }: EchoBoxProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, LINE_PX * MAX_LINES)}px`;
  }, [value]);

  function send() {
    const text = value.trim();
    if (disabled || !text) return;
    onSend(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      className="je-ring flex items-end gap-3 rounded-[22px] bg-je-field p-3"
      style={{ boxShadow: '0 0 32px var(--je-glow), 0 0 64px var(--je-glow-2)' }}
    >
      <textarea
        ref={(el) => {
          ref.current = el;
          if (inputRef) inputRef.current = el;
        }}
        rows={1}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="block min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1 text-[14px] font-medium leading-[22px] text-je-ink placeholder:text-je-muted focus:outline-none"
        style={{ maxHeight: LINE_PX * MAX_LINES }}
      />
      <IconButton variant="grad" size={38} label="Send" icon={ArrowUp} disabled={disabled} onClick={send} />
    </div>
  );
}
