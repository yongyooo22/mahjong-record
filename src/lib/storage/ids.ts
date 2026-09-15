/** 짧은 무작위 ID (시간 기반 접두어 + 무작위) */
export function generateId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}${rand}`;
}
