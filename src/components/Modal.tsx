import { useEffect, type ReactNode } from 'react';
import s from './ui.module.css';

interface Props {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, actions, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={s.overlay} onClick={onClose} role="presentation">
      <div className={s.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <div className={s.modalTitle}>{title}</div>}
        <div className={s.modalBody}>{children}</div>
        {actions && <div className={s.modalActions}>{actions}</div>}
      </div>
    </div>
  );
}
