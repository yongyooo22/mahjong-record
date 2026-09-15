import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

type Variant = 'primary' | 'danger' | 'outline' | 'ghost' | 'red';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
  size?: 'md' | 'sm';
  /** 금색 구름 장식 (주요 버튼에만) */
  decorated?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: s.btnPrimary,
  danger: s.btnDanger,
  outline: s.btnOutline,
  ghost: s.btnGhost,
  red: s.btnRed,
};

function Cloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 34 18" fill="none" aria-hidden="true">
      <path
        d="M3 15c-2.5 0-2.5-4 0-4 0-4 5-4 6-1 1-3 6-3 7 0 1-3 6-3 7 0 2-3 7-2 7 2 3 0 3 4 0 4H3Z"
        stroke="#D9AD5B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 12c1-1 2-1 3 0M18 12c1-1 2-1 3 0" stroke="#D9AD5B" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  loading = false,
  full = false,
  size = 'md',
  decorated = false,
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
      {decorated && !disabled && !loading && (
        <>
          <Cloud className={`${s.deco} ${s.decoLeft}`} />
          <Cloud className={`${s.deco} ${s.decoRight}`} />
        </>
      )}
      {icon}
      {children}
      {loading && <span className={[s.spinner, dark ? s.spinnerDark : ''].join(' ')} aria-hidden="true" />}
    </button>
  );
}
