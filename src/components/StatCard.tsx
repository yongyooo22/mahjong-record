import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import s from './ui.module.css';

/**
 * - default: 통계마다 카드 한 장 (월별 현황·내 기록)
 * - compact: 흰 카드 한 장 안에 칸을 나눠 담는 작은 형태 (홈)
 */
export type StatVariant = 'default' | 'compact';

/** 통계 카드 2×2 격자. compact 에서 to 를 주면 카드 전체가 그 화면으로 가는 링크가 됩니다. */
export function StatGrid({ children, variant = 'default', to }: { children: ReactNode; variant?: StatVariant; to?: string }) {
  if (variant === 'default') return <div className={s.stats}>{children}</div>;
  const grid = <div className={s.statsCompactGrid}>{children}</div>;
  if (!to) return <div className={s.statsCompact}>{grid}</div>;
  return (
    <Link to={to} className={[s.statsCompact, s.statsCompactLink].join(' ')}>
      {grid}
      <ChevronRight size={16} className={s.statsCompactArrow} aria-hidden="true" />
    </Link>
  );
}

/** 아이콘 + 라벨 + 값 + 보조 문구(증감 등) 로 이루어진 통계 카드 */
export function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
  variant = 'default',
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  variant?: StatVariant;
}) {
  if (variant === 'compact') {
    return (
      <div className={s.statCompact}>
        <div className={s.statCompactIcon} style={{ background: tone }}>
          {icon}
        </div>
        <div className={s.statCompactBody}>
          <div className={s.statCompactLabel}>{label}</div>
          <div className={s.statCompactValue}>{value}</div>
          {sub !== undefined && <div className={s.statCompactSub}>{sub}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className={s.stat}>
      <div className={s.statIcon} style={{ background: tone }}>
        {icon}
      </div>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      {sub !== undefined && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}
