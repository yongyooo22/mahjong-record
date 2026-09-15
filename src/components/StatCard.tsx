import type { ReactNode } from 'react';
import s from './ui.module.css';

/** 통계 카드 2×2 격자 */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.stats}>{children}</div>;
}

/** 아이콘 + 라벨 + 값 + 보조 문구(증감 등) 로 이루어진 통계 카드 */
export function StatCard({ icon, tone, label, value, sub }: { icon: ReactNode; tone: string; label: string; value: ReactNode; sub?: ReactNode }) {
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
