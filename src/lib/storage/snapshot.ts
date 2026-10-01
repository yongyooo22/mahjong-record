import { normalizeGame } from '../../../api/_lib/normalize';
import { normalizeSponsor } from '../../../api/_lib/sponsors';
import type { Game, Member, Sponsor } from '../types';

const SNAPSHOT_KEY = 'mahjong.remoteSnapshot';

/** 마지막으로 서버에서 받은 멤버·대국·후원 */
export interface Snapshot {
  members: Member[];
  games: Game[];
  sponsors: Sponsor[];
}

function defaultStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 이 기기에 저장해 둔 서버 데이터. 앱을 다시 열 때 서버 응답을 기다리지 않고 이것부터 보여 줍니다.
 * 없거나 읽을 수 없으면 null.
 */
export function readSnapshot(store: Storage | null = defaultStore()): Snapshot | null {
  try {
    const raw = store?.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Snapshot> | null;
    if (!value || !Array.isArray(value.members) || !Array.isArray(value.games)) return null;
    // 후원 기능 이전에 저장한 스냅샷에는 sponsors 가 없습니다.
    const sponsors = Array.isArray(value.sponsors) ? value.sponsors.map(normalizeSponsor) : [];
    return { members: value.members, games: value.games.map(normalizeGame), sponsors };
  } catch {
    return null;
  }
}

/** 서버 데이터를 저장합니다. null 이면 지웁니다. 저장 공간이 없거나 막혀 있으면 조용히 넘어갑니다. */
export function writeSnapshot(snapshot: Snapshot | null, store: Storage | null = defaultStore()): void {
  try {
    if (snapshot) store?.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    else store?.removeItem(SNAPSHOT_KEY);
  } catch {
    // 캐시 없이도 동작하므로 무시
  }
}
