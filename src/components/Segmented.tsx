import s from './ui.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  full = false,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  /** 줄 너비를 꽉 채우고 칸을 똑같이 나눕니다 */
  full?: boolean;
}) {
  return (
    <div className={[s.seg, full ? s.segFull : ''].join(' ')} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={[s.segBtn, o.value === value ? s.segBtnActive : ''].join(' ')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
