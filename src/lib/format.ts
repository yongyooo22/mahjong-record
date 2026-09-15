const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatWeekday(iso: string): string {
  return `(${WEEKDAYS[new Date(iso).getDay()]})`;
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${formatWeekday(iso)}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${m}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDateFull(iso)} ${formatTime(iso)}`;
}

/** 평균 순위 표시 (2.5 / 2.33) */
export function formatAvgRank(v: number | null): string {
  if (v === null) return '-';
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

/** <input type="date"> 용 YYYY-MM-DD (로컬) */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** <input type="time"> 용 HH:MM (로컬) */
export function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 날짜/시간 입력값을 ISO 문자열로 */
export function fromDateTimeInputs(date: string, time: string): string | null {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
  const dt = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}
