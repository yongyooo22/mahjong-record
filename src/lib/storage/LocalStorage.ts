import { normalizeGame } from '../../../api/_lib/normalize';
import { isUntouchedLegacySeed, SEED_CREATED_AT, SEED_MEMBERS } from '../../config/seedMembers';
import type { Game, Member, MemberPatch, NewGame, NewMember } from '../types';
import { generateId } from './ids';
import { StorageError, type Snapshot, type StorageAdapter } from './StorageAdapter';

const MEMBERS_KEY = 'mahjong.members';
const GAMES_KEY = 'mahjong.games';

function readJson<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage, key: string, value: unknown) {
  store.setItem(key, JSON.stringify(value));
}

/**
 * 브라우저 localStorage 저장소.
 * Redis 환경 변수가 없거나 API 를 쓸 수 없을 때 자동으로 사용됩니다.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = 'local' as const;

  constructor(private readonly store: Storage = window.localStorage) {}

  private members(): Member[] {
    const existing = readJson<Member[]>(this.store, MEMBERS_KEY);
    // 예전 초기 멤버가 손대지 않은 채 남아 있고 대국 기록도 없으면 새 초기 멤버로 교체
    if (existing && !(isUntouchedLegacySeed(existing) && this.games().length === 0)) return existing;
    const seeded: Member[] = SEED_MEMBERS.map((m) => ({
      ...m,
      avatar: null,
      active: true,
      createdAt: SEED_CREATED_AT,
    }));
    writeJson(this.store, MEMBERS_KEY, seeded);
    return seeded;
  }

  private games(): Game[] {
    return (readJson<Game[]>(this.store, GAMES_KEY) ?? []).map(normalizeGame);
  }

  async load(): Promise<Snapshot> {
    return { members: this.members(), games: this.games() };
  }

  async addMember(input: NewMember): Promise<Member> {
    const name = input.name.trim();
    if (!name) throw new StorageError('이름을 입력해 주세요.');
    const list = this.members();
    const id = input.id ?? generateId('m');
    if (list.some((m) => m.id === id)) throw new StorageError('이미 존재하는 ID 입니다.');
    const member: Member = {
      id,
      name,
      avatar: input.avatar?.trim() || null,
      active: input.active ?? true,
      createdAt: new Date().toISOString(),
    };
    writeJson(this.store, MEMBERS_KEY, [...list, member]);
    return member;
  }

  async updateMember(id: string, patch: MemberPatch): Promise<Member> {
    const list = this.members();
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) throw new StorageError('멤버를 찾을 수 없습니다.', 404);
    const updated: Member = {
      ...list[idx],
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.avatar !== undefined ? { avatar: patch.avatar?.trim() || null } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    };
    if (!updated.name) throw new StorageError('이름을 입력해 주세요.');
    const next = [...list];
    next[idx] = updated;
    writeJson(this.store, MEMBERS_KEY, next);
    return updated;
  }

  async addGame(input: NewGame): Promise<Game> {
    const game: Game = { ...input, id: generateId('g'), createdAt: new Date().toISOString() };
    writeJson(this.store, GAMES_KEY, [...this.games(), game]);
    return game;
  }

  async deleteGame(id: string): Promise<void> {
    const list = this.games();
    if (!list.some((g) => g.id === id)) throw new StorageError('대국을 찾을 수 없습니다.', 404);
    writeJson(
      this.store,
      GAMES_KEY,
      list.filter((g) => g.id !== id),
    );
  }
}
