import { formatPoints } from '../lib/scoring';
import s from './ui.module.css';

/** 정산 점수: 양수 녹색, 음수 빨간색 */
export function Points({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const tone = value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero';
  return (
    <span className={[s.points, tone, className ?? ''].join(' ')} style={style}>
      {formatPoints(value)}
    </span>
  );
}
