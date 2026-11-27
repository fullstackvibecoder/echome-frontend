import type { KeyboardEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './cx';

export type PanelProps = {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, onClose, actions, children, className }: PanelProps) {
  // Handler lives on the section (not window) so Escape is never stolen from the Echo box.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') onClose();
  };
  return (
    <section
      aria-label={title}
      onKeyDown={onKeyDown}
      className={cx('flex h-full flex-col border-l border-je-hair bg-je-panel', className)}
    >
      <div className="flex items-center gap-2 p-[20px]">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold">{title}</h2>
        {actions}
        <IconButton label="Close" icon={X} size={30} onClick={onClose} />
      </div>
      <div className="flex flex-1 flex-col gap-[20px] overflow-y-auto p-[20px] pt-0">{children}</div>
    </section>
  );
}
