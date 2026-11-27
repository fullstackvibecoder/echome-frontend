import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  icon: LucideIcon;
  size?: 30 | 34 | 38;
  variant?: 'ghost' | 'grad';
};

const SIZE: Record<30 | 34 | 38, string> = {
  30: 'h-[30px] w-[30px]',
  34: 'h-[34px] w-[34px]',
  38: 'h-[38px] w-[38px]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon: Icon, size = 34, variant = 'ghost', type = 'button', className, ...rest },
  ref,
) {
  const radius = variant === 'grad' ? 'rounded-[11px]' : size === 30 ? 'rounded-[9px]' : 'rounded-[10px]';
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)] disabled:opacity-50',
        SIZE[size],
        radius,
        variant === 'grad' ? 'je-grad text-je-on-grad' : 'border border-je-hair text-je-muted',
        className,
      )}
    >
      <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
    </button>
  );
});
