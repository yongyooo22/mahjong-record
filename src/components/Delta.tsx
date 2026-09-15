import s from './ui.module.css';

interface Props {
  delta: number | null;
  /** 값이 낮을수록 좋은 지표 (평균 순위, 라스 횟수) */
  lowerIsBetter?: boolean;
  /** 소수 표시 자릿수 */
  digits?: 0 | 1;
}

/** 지난달 대비 증감 (▲/▼ + 값). 좋아지면 녹색, 나빠지면 빨간색 */
export function Delta({ delta, lowerIsBetter = false, digits = 1 }: Props) {
  if (delta === null) {
    return <span className={s.deltaHint}>지난달 기록 없음</span>;
  }
  if (delta === 0) {
    return (
      <span className={s.delta}>
        <span className="zero">– 0</span>
        <span className={s.deltaHint}>&nbsp;(지난달 대비)</span>
      </span>
    );
  }
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? '▲' : '▼';
  const abs = digits === 0 ? String(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  return (
    <span className={s.delta}>
      <span className={improved ? 'pos' : 'neg'}>
        {arrow} {abs}
      </span>
      <span className={s.deltaHint}>&nbsp;(지난달 대비)</span>
    </span>
  );
}
