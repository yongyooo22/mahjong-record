import { describe, expect, it } from 'vitest';
import { formatAvgRank, formatDateShortYear, formatTime, fromDateTimeInputs, toDateInput, toTimeInput } from './format';

describe('날짜·시간 표시', () => {
  it('올해면 월·일만, 다른 해면 연도를 붙인다', () => {
    const now = new Date(2025, 9, 12);
    expect(formatDateShortYear('2025-09-28T12:00:00', now)).toBe('9월 28일');
    expect(formatDateShortYear('2024-12-31T12:00:00', now)).toBe('2024년 12월 31일');
  });

  it('12시간제 오전/오후', () => {
    expect(formatTime('2025-03-08T00:05:00')).toBe('오전 12:05');
    expect(formatTime('2025-03-08T12:00:00')).toBe('오후 12:00');
    expect(formatTime('2025-03-08T19:30:00')).toBe('오후 7:30');
  });

  it('평균 순위는 끝의 0을 떼고 최대 소수 둘째 자리까지', () => {
    expect(formatAvgRank(null)).toBe('-');
    expect(formatAvgRank(2)).toBe('2');
    expect(formatAvgRank(2.5)).toBe('2.5');
    expect(formatAvgRank(2.3333)).toBe('2.33');
  });
});

describe('입력 필드 변환', () => {
  it('Date → date/time 입력값 (로컬, 0 채움)', () => {
    const d = new Date(2025, 2, 8, 9, 5);
    expect(toDateInput(d)).toBe('2025-03-08');
    expect(toTimeInput(d)).toBe('09:05');
  });

  it('date/time 입력값 → ISO 문자열, 왕복하면 같은 시각', () => {
    const iso = fromDateTimeInputs('2025-03-08', '19:30');
    expect(iso).not.toBeNull();
    const d = new Date(iso!);
    expect(toDateInput(d)).toBe('2025-03-08');
    expect(toTimeInput(d)).toBe('19:30');
  });

  it('비어 있거나 깨진 입력은 null', () => {
    expect(fromDateTimeInputs('', '19:30')).toBeNull();
    expect(fromDateTimeInputs('2025-03-08', '')).toBeNull();
    expect(fromDateTimeInputs('2025-03', '19:30')).toBeNull();
    expect(fromDateTimeInputs('abcd-ef-gh', '19:30')).toBeNull();
  });
});
