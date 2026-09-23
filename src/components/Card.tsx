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
}: {
  icon?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  to?: string;
}) {
  const rightNode =
    right === undefined ? null : to ? (
      <Link to={to} className={s.sectionRight}>
        {right}
        <ChevronRight size={16} />
      </Link>
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
