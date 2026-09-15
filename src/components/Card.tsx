import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './ui.module.css';

export function Card({ className, tight, ...rest }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
  return <div className={[s.card, tight ? s.cardTight : '', className ?? ''].join(' ')} {...rest} />;
}

export function SectionHeader({
  icon,
  title,
  right,
  to,
  onRightClick,
}: {
  icon?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  to?: string;
  onRightClick?: () => void;
}) {
  const rightNode =
    right === undefined ? null : to ? (
      <Link to={to} className={s.sectionRight}>
        {right}
        <ChevronRight size={16} />
      </Link>
    ) : onRightClick ? (
      <button type="button" className={s.sectionRight} onClick={onRightClick}>
        {right}
        <ChevronRight size={16} />
      </button>
    ) : (
      <span className={s.sectionRight}>{right}</span>
    );
  return (
    <div className={s.sectionHead}>
      <h2>
        {icon}
        {title}
      </h2>
      {rightNode}
    </div>
  );
}
