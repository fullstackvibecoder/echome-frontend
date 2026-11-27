import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, type = 'button', disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]',
        size === 'md' ? 'h-10 rounded-[12px] px-4 text-[13px]' : 'h-8 rounded-[8px] px-3 text-[12px]',
        variant === 'primary' ? 'je-grad text-je-on-grad' : 'bg-je-item border border-je-hair text-je-ink',
        loading && 'opacity-70',
        disabled && !loading && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
