import { useEffect, useId, useRef, type ReactNode } from 'react';
import s from './ui.module.css';

interface Props {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 바닥(폰) / 가운데(넓은 화면) 모달.
 * 열리면 첫 입력 요소에 포커스를 두고 Tab 이 모달 안에서만 돌며, 닫히면 열기 전 요소로 포커스를 돌려줍니다.
 */
export function Modal({ open, title, children, actions, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // onClose 는 보통 매 렌더마다 새 함수라 ref 로 들고, 포커스 처리는 open 이 바뀔 때만 합니다
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // autoFocus 가 붙은 입력이 있으면 그쪽이 이미 포커스를 가져갔으므로 건드리지 않습니다
    if (dialog && !dialog.contains(document.activeElement)) (focusables()[0] ?? dialog).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={s.overlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={s.modalTitle} id={titleId}>
            {title}
          </div>
        )}
        <div className={s.modalBody}>{children}</div>
        {actions && <div className={s.modalActions}>{actions}</div>}
      </div>
    </div>
  );
}
