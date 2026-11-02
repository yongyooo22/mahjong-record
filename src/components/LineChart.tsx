import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatPoints } from '../lib/scoring';
import s from './ui.module.css';

export interface ChartSeries {
  id: string;
  /** 가로축 순서대로의 값 (맨 앞은 시작점) */
  values: number[];
  /** CSS 색 (var(--chart-me) 등) */
  color: string;
  /** 강조 선은 굵게 그리고 끝에 이름표를 붙입니다. */
  emphasis?: boolean;
  /** 끝 이름표 글자 (강조 선만) */
  label?: string;
}

export interface ChartDot {
  index: number;
  value: number;
  color: string;
}

interface Props {
  series: ChartSeries[];
  /** 가로축 글자 (values 와 같은 길이, 빈 글자는 생략) */
  xLabels: string[];
  /** 선 위의 점 (예: 판마다 순위 색) */
  dots?: ChartDot[];
  /** 누른(가리킨) 위치의 말풍선 내용. index 는 1 부터 (0 은 시작점) */
  renderTip: (index: number) => ReactNode;
  /** 말풍선이 떠 있는 위치를 한 번 더 누르면(마우스는 클릭하면) 호출 */
  onOpen?: (index: number) => void;
  ariaLabel: string;
}

const W = 320;
const H = 190;
const PAD = { left: 30, right: 52, top: 10, bottom: 24 };
/** 가로축 글자 사이 최소 간격 (viewBox 단위) */
const LABEL_GAP = 30;

function niceScale(min: number, max: number) {
  const span = Math.max(max - min, 1);
  const step = [5, 10, 20, 25, 50, 100, 200, 250, 500].find((v) => span / v <= 5) ?? 1000;
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

function tickLabel(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

/** 대국 순서에 따른 누적 우마 선 그래프. 차트 라이브러리 없이 SVG 로 그립니다. */
export function LineChart({ series, xLabels, dots, renderTip, onOpen, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // 누르기 직전에 말풍선이 떠 있던 위치 (터치는 두 번째 누름에서 이동)
  const activeBeforePress = useRef<number | null>(null);
  const pointerType = useRef('mouse');

  const n = xLabels.length;
  const all = series.flatMap((x) => x.values);
  const { lo, hi, step } = niceScale(Math.min(0, ...all), Math.max(0, ...all));
  const x = (i: number) => PAD.left + (n > 1 ? i / (n - 1) : 0) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  // 다른 곳을 누르면 말풍선을 닫습니다.
  useEffect(() => {
    if (active === null) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [active]);

  if (n < 2) return null;

  const indexAt = (clientX: number) => {
    const box = svgRef.current!.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1));
    return Math.max(1, Math.min(n - 1, i));
  };

  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);

  const shownLabels: { i: number; text: string }[] = [];
  let lastX = -Infinity;
  xLabels.forEach((text, i) => {
    if (!text || x(i) - lastX < LABEL_GAP) return;
    lastX = x(i);
    shownLabels.push({ i, text });
  });

  const background = series.filter((a) => !a.emphasis);
  const emphasized = series.filter((a) => a.emphasis);
  // 끝 이름표가 겹치면 아래로 벌립니다.
  const endLabels = emphasized
    .map((a) => ({ a, y: y(a.values[n - 1]) }))
    .sort((p, q) => p.y - q.y)
    .reduce<{ a: ChartSeries; y: number }[]>((acc, cur) => {
      const prev = acc[acc.length - 1];
      acc.push(prev && cur.y - prev.y < 13 ? { ...cur, y: prev.y + 13 } : cur);
      return acc;
    }, []);

  const path = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  // 말풍선은 가리킨 점 오른쪽에, 넘치면 왼쪽에
  const tipLeftPct = active === null ? 0 : (x(active) / W) * 100;
  const tipOnLeft = tipLeftPct > 55;

  return (
    <div ref={wrapRef} className={s.chart}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={s.chartSvg}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? 'var(--chart-zero)' : 'var(--chart-grid)' }} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={PAD.left - 6} y={y(v) + 3.5} textAnchor="end" className={s.chartTick}>
              {tickLabel(v)}
            </text>
          </g>
        ))}
        {shownLabels.map(({ i, text }) => (
          <text key={i} x={x(i)} y={H - 7} textAnchor="middle" className={s.chartTick}>
            {text}
          </text>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} className={s.chartGuide} />}
        {[...background, ...emphasized].map((a) => (
          <path key={a.id} d={path(a.values)} fill="none" style={{ stroke: a.color }} strokeWidth={a.emphasis ? 2.5 : 1.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {dots?.map((d) => (
          <circle key={d.index} cx={x(d.index)} cy={y(d.value)} r={active === d.index ? 5.5 : 4.2} style={{ fill: d.color, stroke: 'var(--white)' }} strokeWidth={2} />
        ))}
        {endLabels.map(({ a, y: ly }) => {
          const last = a.values[n - 1];
          return (
            <g key={a.id}>
              <circle cx={x(n - 1)} cy={y(last)} r={4} style={{ fill: a.color, stroke: 'var(--white)' }} strokeWidth={2} />
              <text x={x(n - 1) + 7} y={ly + 3.5} className={s.chartEndLabel}>
                {a.label}{' '}
                <tspan style={{ fill: last > 0 ? 'var(--up)' : last < 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatPoints(last)}</tspan>
              </text>
            </g>
          );
        })}
        <rect
          x={PAD.left - 10}
          y={0}
          width={W - PAD.left - PAD.right + 20}
          height={H}
          fill="transparent"
          className={s.chartHit}
          onPointerDown={(e) => {
            pointerType.current = e.pointerType;
            activeBeforePress.current = active;
            setActive(indexAt(e.clientX));
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse') setActive(indexAt(e.clientX));
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setActive(null);
          }}
          onClick={(e) => {
            const i = indexAt(e.clientX);
            if (onOpen && (pointerType.current === 'mouse' || activeBeforePress.current === i)) onOpen(i);
          }}
        />
      </svg>
      {active !== null && (
        <div className={s.chartTip} style={tipOnLeft ? { right: `calc(${100 - tipLeftPct}% + 10px)` } : { left: `calc(${tipLeftPct}% + 10px)` }} role="status">
          {renderTip(active)}
        </div>
      )}
    </div>
  );
}
