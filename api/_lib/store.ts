import { Redis } from '@upstash/redis';
import { isUntouchedLegacySeed, SEED_CREATED_AT, SEED_MEMBERS } from './seedMembers';
import type { Game, Member } from '../../src/lib/types';

export const MEMBERS_KEY = 'mahjong:members';
export const GAMES_KEY = 'mahjong:games';

/** 서버 저장소 인터페이스 — Redis 구현과 테스트용 메모리 구현이 있습니다. */
export interface Store {
  getMembers(): Promise<Member[] | null>;
  setMembers(members: Member[]): Promise<void>;
  getGames(): Promise<Game[]>;
  putGame(game: Game): Promise<void>;
  deleteGame(id: string): Promise<boolean>;
}

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export class RedisStore implements Store {
  private redis: Redis;

  constructor(env: { url: string; token: string }) {
    this.redis = new Redis({ url: env.url, token: env.token });
  }

  async getMembers(): Promise<Member[] | null> {
    const value = await this.redis.get<Member[] | string>(MEMBERS_KEY);
    if (value == null) return null;
    return typeof value === 'string' ? (JSON.parse(value) as Member[]) : value;
  }

  async setMembers(members: Member[]): Promise<void> {
    await this.redis.set(MEMBERS_KEY, JSON.stringify(members));
  }

  async getGames(): Promise<Game[]> {
    const hash = await this.redis.hgetall<Record<string, Game | string>>(GAMES_KEY);
    if (!hash) return [];
    return Object.values(hash).map((v) => (typeof v === 'string' ? (JSON.parse(v) as Game) : v));
  }

  async putGame(game: Game): Promise<void> {
    await this.redis.hset(GAMES_KEY, { [game.id]: JSON.stringify(game) });
  }

  async deleteGame(id: string): Promise<boolean> {
    const removed = await this.redis.hdel(GAMES_KEY, id);
    return removed > 0;
  }
}

/** 테스트용 메모리 저장소 */
export class MemoryStore implements Store {
  members: Member[] | null = null;
  games = new Map<string, Game>();

  async getMembers() {
    return this.members ? [...this.members] : null;
  }
  async setMembers(members: Member[]) {
    this.members = [...members];
  }
  async getGames() {
    return [...this.games.values()];
  }
  async putGame(game: Game) {
    this.games.set(game.id, game);
  }
  async deleteGame(id: string) {
    return this.games.delete(id);
  }
}

let cached: Store | null = null;

/** 환경 변수가 있으면 Redis 저장소, 없으면 null (클라이언트가 localStorage 폴백) */
export function getStore(): Store | null {
  if (cached) return cached;
  const env = redisEnv();
  if (!env) return null;
  cached = new RedisStore(env);
  return cached;
}

function seedMembers(): Member[] {
  return SEED_MEMBERS.map((m) => ({ ...m, avatar: null, active: true, createdAt: SEED_CREATED_AT }));
}

/**
 * 저장된 멤버가 없으면 초기 멤버를 한 번만 시드합니다.
 * 예전 초기 멤버가 손대지 않은 채 남아 있고 대국 기록도 없으면 새 초기 멤버로 교체합니다.
 * (대국 목록은 예전 초기 멤버일 때만 필요하므로 지연 조회)
 */
async function seedIfNeeded(store: Store, existing: Member[] | null, games: () => Promise<Game[]>): Promise<Member[]> {
  if (existing && !(isUntouchedLegacySeed(existing) && (await games()).length === 0)) return existing;
  const seeded = seedMembers();
  await store.setMembers(seeded);
  return seeded;
}

/** 멤버 목록 (없으면 시드) */
export async function loadMembers(store: Store): Promise<Member[]> {
  return seedIfNeeded(store, await store.getMembers(), () => store.getGames());
}

/** 첫 화면용: 멤버와 대국을 한 번에 병렬로 읽습니다 (Redis 왕복 1회분 시간). */
export async function loadMembersAndGames(store: Store): Promise<{ members: Member[]; games: Game[] }> {
  const [existing, games] = await Promise.all([store.getMembers(), store.getGames()]);
  const members = await seedIfNeeded(store, existing, async () => games);
  return { members, games };
}
