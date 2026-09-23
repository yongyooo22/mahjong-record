import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

type Variant = 'primary' | 'danger' | 'outline' | 'ghost' | 'red';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
  size?: 'md' | 'sm';
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: s.btnPrimary,
  danger: s.btnDanger,
  outline: s.btnOutline,
  ghost: s.btnGhost,
  red: s.btnRed,
};

export function Button({
  variant = 'primary',
  loading = false,
  full = false,
  size = 'md',
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  const dark = variant === 'outline' || variant === 'ghost' || variant === 'red';
  return (
    <button
      type={type}
      className={[
        s.btn,
        variantClass[variant],
        full ? s.btnFull : '',
        size === 'sm' ? s.btnSm : '',
        loading ? s.btnLoading : '',
        className ?? '',
      ].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {children}
      {loading && <span className={[s.spinner, dark ? s.spinnerDark : ''].join(' ')} aria-hidden="true" />}
    </button>
  );
}
