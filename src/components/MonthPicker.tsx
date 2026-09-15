import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthKey, previousMonthKey } from '../lib/stats';
import s from './ui.module.css';

function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthPicker({ value, onChange, max }: { value: string; onChange: (k: string) => void; max: string }) {
  return (
    <div className={s.month}>
      <button type="button" className={s.monthBtn} onClick={() => onChange(previousMonthKey(value))} aria-label="이전 달">
        <ChevronLeft size={18} />
      </button>
      <span className={s.monthLabel}>{formatMonthKey(value)}</span>
      <button
        type="button"
        className={s.monthBtn}
        onClick={() => onChange(nextMonthKey(value))}
        disabled={value >= max}
        aria-label="다음 달"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
