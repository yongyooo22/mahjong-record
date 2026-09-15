import type { Game, Member } from './types';
import { computeResults, round1 } from './scoring';

/** 'YYYY-MM' 형식의 월 키 (로컬 시간 기준) */
export function monthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKey(now);
}

export function previousMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${y}년 ${m}월`;
}

export function gamesInMonth(games: Game[], key: string): Game[] {
  return games.filter((g) => monthKey(g.playedAt) === key);
}

/** 대국 목록에 등장하는 월 키를 최신순으로 */
export function availableMonths(games: Game[]): string[] {
  const set = new Set(games.map((g) => monthKey(g.playedAt)));
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

/** 최신순 정렬 (대국 일시 → 생성 시각) */
export function sortGamesDesc(games: Game[]): Game[] {
  return [...games].sort(
    (a, b) =>
      new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime() ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export interface MemberStats {
  memberId: string;
  games: number;
  totalPoints: number;
  /** 평균 순위 (대국이 없으면 null) */
  avgRank: number | null;
  /** 대국당 평균 우마(정산 점수) (대국이 없으면 null) */
  avgPoints: number | null;
  rankCounts: [number, number, number, number];
  firstRate: number;
  /** 이 멤버가 낸 역만 수 */
  yakumanCount: number;
}

function emptyStats(memberId: string): MemberStats {
  return { memberId, games: 0, totalPoints: 0, avgRank: null, avgPoints: null, rankCounts: [0, 0, 0, 0], firstRate: 0, yakumanCount: 0 };
}

/** 대국 목록으로 멤버별 통계를 계산합니다. */
export function computeMemberStats(games: Game[], memberIds?: string[]): Map<string, MemberStats> {
  const map = new Map<string, MemberStats>();
  const acc = new Map<string, { rankSum: number }>();
  const ensure = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = emptyStats(id);
      map.set(id, s);
      acc.set(id, { rankSum: 0 });
    }
    return s;
  };
  memberIds?.forEach(ensure);

  for (const game of games) {
    const results = computeResults(game.scores, game.rules, game.gameType);
    game.playerIds.forEach((id, i) => {
      const r = results[i];
      if (!r) return;
      const s = ensure(id);
      s.games += 1;
      s.totalPoints = round1(s.totalPoints + r.points);
      if (r.rank >= 1 && r.rank <= 4) s.rankCounts[r.rank - 1] += 1;
      acc.get(id)!.rankSum += r.rank;
    });
    for (const y of game.yakumans ?? []) {
      if (game.playerIds.includes(y.playerId)) ensure(y.playerId).yakumanCount += 1;
    }
  }

  for (const [id, s] of map) {
    if (s.games > 0) {
      s.avgRank = Math.round((acc.get(id)!.rankSum / s.games) * 100) / 100;
      s.avgPoints = round1(s.totalPoints / s.games);
      s.firstRate = Math.round((s.rankCounts[0] / s.games) * 1000) / 10;
    }
  }
  return map;
}

export interface RankingRow extends MemberStats {
  member: Member;
  position: number;
}

/**
 * 랭킹: 누적 우마(정산 점수) 내림차순, 같으면 평균 순위 오름차순, 대국 수 내림차순.
 * 대국이 하나도 없는 멤버는 제외합니다.
 */
export function computeRanking(games: Game[], members: Member[]): RankingRow[] {
  const stats = computeMemberStats(games);
  const byId = new Map(members.map((m) => [m.id, m]));
  const rows: RankingRow[] = [];
  for (const [id, s] of stats) {
    const member = byId.get(id);
    if (!member || s.games === 0) continue;
    rows.push({ ...s, member, position: 0 });
  }
  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      (a.avgRank ?? 9) - (b.avgRank ?? 9) ||
      b.games - a.games ||
      a.member.name.localeCompare(b.member.name, 'ko'),
  );
  rows.forEach((r, i) => (r.position = i + 1));
  return rows;
}

export interface StatDelta {
  current: number | null;
  previous: number | null;
  /** current - previous (둘 중 하나라도 없으면 null) */
  delta: number | null;
}

function delta(current: number | null, previous: number | null): StatDelta {
  if (current === null || previous === null) return { current, previous, delta: null };
  return { current, previous, delta: round1(current - previous) };
}

export interface MonthlySummary {
  month: string;
  /** 참여 횟수 */
  games: StatDelta;
  avgRank: StatDelta;
  /** 대국당 평균 우마 */
  avgPoints: StatDelta;
  firstCount: StatDelta;
  lastCount: StatDelta;
  totalPoints: StatDelta;
}

/** 특정 멤버의 이번 달 요약 (지난달 대비 증감 포함) */
export function computeMonthlySummary(games: Game[], memberId: string, month: string): MonthlySummary {
  const cur = computeMemberStats(gamesInMonth(games, month), [memberId]).get(memberId)!;
  const prev = computeMemberStats(gamesInMonth(games, previousMonthKey(month)), [memberId]).get(memberId)!;
  const prevPlayed = prev.games > 0;
  return {
    month,
    games: delta(cur.games, prevPlayed ? prev.games : null),
    avgRank: delta(cur.avgRank, prevPlayed ? prev.avgRank : null),
    avgPoints: delta(cur.avgPoints, prevPlayed ? prev.avgPoints : null),
    firstCount: delta(cur.rankCounts[0], prevPlayed ? prev.rankCounts[0] : null),
    lastCount: delta(cur.rankCounts[3], prevPlayed ? prev.rankCounts[3] : null),
    totalPoints: delta(cur.totalPoints, prevPlayed ? prev.totalPoints : null),
  };
}

export interface TopMember {
  /** 지표가 가장 큰 멤버들 (동률이면 여러 명, 대국 참여 순서 무관) */
  memberIds: string[];
  /** 지표 값 (참여 수·평균 우마·1위 횟수) */
  value: number;
  /** 이번 달에 대국한 멤버 수 (전원 동률 표시용) */
  candidates: number;
}

export interface GroupSummary {
  month: string;
  /** 이번 달 대국 수 (지난달 대비) */
  games: StatDelta;
  /** 가장 많이 참여한 멤버 (value = 참여 횟수) */
  mostActive: TopMember | null;
  /** 대국당 평균 우마가 가장 높은 멤버 (value = 평균 우마) */
  bestAverage: TopMember | null;
  /** 1위를 가장 많이 한 멤버 (value = 1위 횟수) */
  topFirst: TopMember | null;
}

/** 지표가 가장 큰 멤버들. 동률이면 모두 포함합니다. */
function topMembers(stats: Map<string, MemberStats>, metric: (s: MemberStats) => number | null): TopMember | null {
  let best: number | null = null;
  let ids: string[] = [];
  let candidates = 0;
  for (const [memberId, s] of stats) {
    if (s.games === 0) continue;
    candidates += 1;
    const value = metric(s);
    if (value === null) continue;
    if (best === null || value > best) {
      best = value;
      ids = [memberId];
    } else if (value === best) {
      ids.push(memberId);
    }
  }
  return best === null ? null : { memberIds: ids, value: best, candidates };
}

/** 모임 전체의 이번 달 요약 — 누가 보든 같은 값 (홈 화면용) */
export function computeGroupSummary(games: Game[], month: string): GroupSummary {
  const cur = gamesInMonth(games, month);
  const prev = gamesInMonth(games, previousMonthKey(month));
  const stats = computeMemberStats(cur);
  return {
    month,
    games: delta(cur.length, prev.length > 0 ? prev.length : null),
    mostActive: topMembers(stats, (s) => s.games),
    bestAverage: topMembers(stats, (s) => s.avgPoints),
    topFirst: topMembers(stats, (s) => (s.rankCounts[0] > 0 ? s.rankCounts[0] : null)),
  };
}

export interface MemberGameRow {
  game: Game;
  rank: number;
  score: number;
  points: number;
}

/** 특정 멤버가 참여한 대국을 최신순으로, 그 멤버의 순위·점수와 함께 */
export function gamesForMember(games: Game[], memberId: string): MemberGameRow[] {
  const rows: MemberGameRow[] = [];
  for (const game of sortGamesDesc(games)) {
    const index = game.playerIds.indexOf(memberId);
    if (index < 0) continue;
    const r = computeResults(game.scores, game.rules, game.gameType)[index];
    if (!r) continue;
    rows.push({ game, rank: r.rank, score: r.score, points: r.points });
  }
  return rows;
}
