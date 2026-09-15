import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import s from '../styles/App.module.css';

/** 서브 화면 공용 녹색 헤더 (뒤로가기 + 제목) */
export function PageHeader({ title, back = false, right, children }: { title: string; back?: boolean; right?: ReactNode; children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <div className={s.pageTitleBar}>
          {back ? (
            <button type="button" className={s.iconBtn} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="뒤로 가기">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <span className={s.iconBtnSpacer} />
          )}
          <h1>{title}</h1>
          {right ?? <span className={s.iconBtnSpacer} />}
        </div>
        {children}
      </div>
    </header>
  );
}
