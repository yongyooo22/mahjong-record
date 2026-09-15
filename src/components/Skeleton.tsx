import s from './ui.module.css';

export function Skeleton({ height = 16, width = '100%', radius, style }: { height?: number; width?: number | string; radius?: number; style?: React.CSSProperties }) {
  return <div className={s.skeleton} style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 3, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
