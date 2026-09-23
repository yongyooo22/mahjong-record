import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Game, Member, Yakuman } from '../../src/lib/types';
import { normalizeGame } from './normalize';
import { generateId, HttpError, methodNotAllowed, paramString, parseBody, withStore } from './http';
import { loadMembers, loadMembersAndGames, type Store } from './store';

const GAME_TYPES = new Set(['hanchan', 'tonpuu']);
const PLACE_MAX = 40;
const YAKUMAN_NAME_MAX = 40;
const YAKUMAN_MAX = 8;

/** 저장된 대국을 현재 스키마로 맞추고 최신순으로 정렬 */
function presentGames(games: Game[]): Game[] {
  const list = games.map(normalizeGame);
  list.sort((a, b) => (a.playedAt < b.playedAt ? 1 : a.playedAt > b.playedAt ? -1 : 0));
  return list;
}

function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function validateGame(input: Record<string, unknown>, members: Member[]): Omit<Game, 'id' | 'createdAt'> {
  const playerCount = Number(input.playerCount ?? 4);
  if (!Number.isInteger(playerCount) || playerCount < 3 || playerCount > 4) {
    throw new HttpError(400, '대국 인원은 3 또는 4 이어야 합니다.');
  }
  const gameType = typeof input.gameType === 'string' && GAME_TYPES.has(input.gameType) ? input.gameType : null;
  if (!gameType) throw new HttpError(400, '대국 방식이 올바르지 않습니다.');

  const playedAt = typeof input.playedAt === 'string' ? new Date(input.playedAt) : null;
  if (!playedAt || Number.isNaN(playedAt.getTime())) throw new HttpError(400, '대국 일시가 올바르지 않습니다.');

  const playerIds = Array.isArray(input.playerIds) ? input.playerIds.map(String) : [];
  const scores = Array.isArray(input.scores) ? input.scores.map(Number) : [];
  if (playerIds.length !== playerCount || scores.length !== playerCount) {
    throw new HttpError(400, `참가자와 점수는 각각 ${playerCount}개여야 합니다.`);
  }
  if (new Set(playerIds).size !== playerIds.length) throw new HttpError(400, '같은 멤버를 중복 선택할 수 없습니다.');
  const known = new Set(members.map((m) => m.id));
  if (playerIds.some((id) => !known.has(id))) throw new HttpError(400, '등록되지 않은 멤버가 포함되어 있습니다.');
  if (scores.some((s) => !Number.isFinite(s))) throw new HttpError(400, '점수가 올바르지 않습니다.');

  const rules = input.rules as Record<string, unknown> | undefined;
  const uma = Array.isArray(rules?.uma) ? rules!.uma.map(Number) : [];
  if (
    !rules ||
    !Number.isFinite(Number(rules.startPoints)) ||
    !Number.isFinite(Number(rules.returnPoints)) ||
    uma.length !== 4 ||
    uma.some((u) => !Number.isFinite(u))
  ) {
    throw new HttpError(400, '정산 규칙이 올바르지 않습니다.');
  }

  const rawYakumans = Array.isArray(input.yakumans) ? input.yakumans : [];
  if (rawYakumans.length > YAKUMAN_MAX) throw new HttpError(400, `역만은 최대 ${YAKUMAN_MAX}건까지 기록할 수 있습니다.`);
  const yakumans: Yakuman[] = rawYakumans.map((y) => {
    const item = (y ?? {}) as Record<string, unknown>;
    const playerId = str(item.playerId, 40);
    const name = str(item.name, YAKUMAN_NAME_MAX);
    if (!playerIds.includes(playerId)) throw new HttpError(400, '역만을 낸 사람은 참가자 중에서 골라야 합니다.');
    if (!name) throw new HttpError(400, '역만 이름을 입력해 주세요.');
    return { playerId, name };
  });

  return {
    playedAt: playedAt.toISOString(),
    place: str(input.place, PLACE_MAX),
    playerCount,
    gameType: gameType as Game['gameType'],
    playerIds,
    scores: scores.map((s) => Math.round(s)),
    yakumans,
    rules: {
      startPoints: Number(rules.startPoints),
      returnPoints: Number(rules.returnPoints),
      uma: uma as [number, number, number, number],
      tonpuuUmaMultiplier: Number.isFinite(Number(rules.tonpuuUmaMultiplier)) ? Number(rules.tonpuuUmaMultiplier) : 1,
    },
  };
}

/**
 * GET /api/bootstrap — 앱 첫 로딩용. 멤버와 대국을 서버리스 함수 호출 한 번으로 돌려줍니다.
 * (멤버·대국을 따로 부르면 함수 콜드 스타트가 두 번 겹쳐 첫 화면이 느려집니다.)
 */
export const bootstrapHandler = (resolveStore?: () => Store | null) =>
  withStore(async (req: VercelRequest, res: VercelResponse, store: Store) => {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET']);
      return;
    }
    const { members, games } = await loadMembersAndGames(store);
    res.status(200).json({ members, games: presentGames(games) });
  }, resolveStore);

/** GET /api/members, POST /api/members */
export const membersHandler = (resolveStore?: () => Store | null) =>
  withStore(async (req: VercelRequest, res: VercelResponse, store: Store) => {
    if (req.method === 'GET') {
      res.status(200).json(await loadMembers(store));
      return;
    }
    if (req.method === 'POST') {
      const body = parseBody(req);
      const name = str(body.name, 20);
      if (!name) throw new HttpError(400, '이름을 입력해 주세요.');
      const members = await loadMembers(store);
      const id = str(body.id, 40) || generateId('m');
      if (members.some((m) => m.id === id)) throw new HttpError(409, '이미 존재하는 ID 입니다.');
      const member: Member = {
        id,
        name,
        avatar: str(body.avatar, 100) || null,
        active: body.active === undefined ? true : Boolean(body.active),
        createdAt: new Date().toISOString(),
      };
      await store.setMembers([...members, member]);
      res.status(201).json(member);
      return;
    }
    methodNotAllowed(res, ['GET', 'POST']);
  }, resolveStore);

/** PUT /api/members/:id */
export const memberByIdHandler = (resolveStore?: () => Store | null) =>
  withStore(async (req: VercelRequest, res: VercelResponse, store: Store) => {
    const id = paramString(req.query.id);
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      methodNotAllowed(res, ['PUT']);
      return;
    }
    const body = parseBody(req);
    const members = await loadMembers(store);
    const idx = members.findIndex((m) => m.id === id);
    if (idx < 0) throw new HttpError(404, '멤버를 찾을 수 없습니다.');
    const current = members[idx];
    const updated: Member = { ...current };
    if (body.name !== undefined) {
      const name = str(body.name, 20);
      if (!name) throw new HttpError(400, '이름을 입력해 주세요.');
      updated.name = name;
    }
    if (body.avatar !== undefined) updated.avatar = str(body.avatar, 100) || null;
    if (body.active !== undefined) updated.active = Boolean(body.active);
    const next = [...members];
    next[idx] = updated;
    await store.setMembers(next);
    res.status(200).json(updated);
  }, resolveStore);

/** GET /api/games, POST /api/games */
export const gamesHandler = (resolveStore?: () => Store | null) =>
  withStore(async (req: VercelRequest, res: VercelResponse, store: Store) => {
    if (req.method === 'GET') {
      res.status(200).json(presentGames(await store.getGames()));
      return;
    }
    if (req.method === 'POST') {
      const body = parseBody(req);
      const members = await loadMembers(store);
      const validated = validateGame(body, members);
      const game: Game = { ...validated, id: generateId('g'), createdAt: new Date().toISOString() };
      await store.putGame(game);
      res.status(201).json(game);
      return;
    }
    methodNotAllowed(res, ['GET', 'POST']);
  }, resolveStore);

/** DELETE /api/games/:id */
export const gameByIdHandler = (resolveStore?: () => Store | null) =>
  withStore(async (req: VercelRequest, res: VercelResponse, store: Store) => {
    const id = paramString(req.query.id);
    if (req.method !== 'DELETE') {
      methodNotAllowed(res, ['DELETE']);
      return;
    }
    const removed = await store.deleteGame(id);
    if (!removed) throw new HttpError(404, '대국을 찾을 수 없습니다.');
    res.status(200).json({ ok: true, id });
  }, resolveStore);
