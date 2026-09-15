import { Redis } from '@upstash/redis';
import { SEED_CREATED_AT, SEED_MEMBERS } from './seedMembers';
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

export function redisEnv(): { url: string; token: string } | null {
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

/** 멤버 목록을 읽고, 비어 있으면 샘플 멤버를 한 번만 시드합니다. */
export async function loadMembers(store: Store): Promise<Member[]> {
  const existing = await store.getMembers();
  if (existing) return existing;
  const seeded: Member[] = SEED_MEMBERS.map((m) => ({
    ...m,
    avatar: null,
    active: true,
    createdAt: SEED_CREATED_AT,
  }));
  await store.setMembers(seeded);
  return seeded;
}
