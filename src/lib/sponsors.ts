import type { Member, Sponsor, SponsorStatus } from './types';

export const SPONSOR_STATUS_LABEL: Record<SponsorStatus, string> = {
  open: '진행 중',
  achieved: '달성',
  paid: '지급 완료',
};

/** 지급까지 끝난 후원이 홈의 "최근 달성" 에 남아 있는 기간 (달성일 기준) */
export const RECENT_ACHIEVEMENT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function time(iso: string | null): number {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** 등록순 (먼저 건 후원이 위) */
function byCreated(a: Sponsor, b: Sponsor): number {
  return time(a.createdAt) - time(b.createdAt);
}

/** 최근 달성순 (같으면 등록순) */
function byAchievedDesc(a: Sponsor, b: Sponsor): number {
  return time(b.achievedAt) - time(a.achievedAt) || byCreated(a, b);
}

/** 상태별 후원 목록 — 진행 중은 등록순(새 후원이 생겨도 순서가 그대로), 달성·지급 완료는 최근 달성순 */
export function groupSponsors(sponsors: Sponsor[]): Record<SponsorStatus, Sponsor[]> {
  const groups: Record<SponsorStatus, Sponsor[]> = { open: [], achieved: [], paid: [] };
  for (const s of sponsors) groups[s.status].push(s);
  groups.open.sort(byCreated);
  groups.achieved.sort(byAchievedDesc);
  groups.paid.sort(byAchievedDesc);
  return groups;
}

/**
 * 홈 "최근 달성" 한 줄에 보일 후원: 상품 지급 전인 후원(언제 달성했든)과
 * 최근 {@link RECENT_ACHIEVEMENT_DAYS}일 안에 달성한 지급 완료 후원 중 가장 최근에 달성한 것. 없으면 null.
 */
export function recentAchievement(sponsors: Sponsor[], now: Date = new Date()): Sponsor | null {
  const since = now.getTime() - RECENT_ACHIEVEMENT_DAYS * DAY_MS;
  const candidates = sponsors.filter((s) => s.status === 'achieved' || (s.status === 'paid' && time(s.achievedAt) >= since));
  return candidates.sort(byAchievedDesc)[0] ?? null;
}

/** 후원자 이름 — 멤버면 지금 이름, 아니면 저장된 이름 */
export function sponsorDisplayName(sponsor: Sponsor, memberMap: Map<string, Member>): string {
  return (sponsor.sponsorId && memberMap.get(sponsor.sponsorId)?.name) || sponsor.sponsorName;
}
