import s from './ui.module.css';

interface Props {
  rank: number;
  size?: 'sm' | 'md';
  pill?: boolean;
  className?: string;
}

const rankClass: Record<number, string> = { 1: s.rank1, 2: s.rank2, 3: s.rank3, 4: s.rank4 };

/** 순위 배지: 1위 금, 2위 은, 3위 동, 4위 회색. 한자 대신 숫자로 표기. */
export function RankBadge({ rank, size = 'md', pill = false, className }: Props) {
  return (
    <span
      className={[s.rank, pill ? s.rankPill : size === 'sm' ? s.rankSm : s.rankMd, rankClass[rank] ?? s.rank4, className ?? '']
        .join(' ')
        .trim()}
      aria-label={`${rank}위`}
    >
      {rank}위
    </span>
  );
}
