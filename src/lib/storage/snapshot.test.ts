import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../../config/rules';
import type { Game, Member, Sponsor } from '../types';
import { readSnapshot, writeSnapshot } from './snapshot';

const member: Member = { id: 'a', name: 'A', avatar: null, active: true, createdAt: '2025-01-01T00:00:00.000Z' };
const game: Game = {
  id: 'g1',
  playedAt: '2025-03-08T10:30:00.000Z',
  place: '마작카페',
  playerCount: 4,
  gameType: 'hanchan',
  playerIds: ['a', 'b', 'c', 'd'],
  scores: [40000, 30000, 20000, 10000],
  yakumans: [],
  createdAt: '2025-03-08T10:30:00.000Z',
  rules: DEFAULT_RULES,
};
const sponsor: Sponsor = {
  id: 's1',
  title: '1호 역만',
  condition: '마고모 1호 역만 (카조에 제외)',
  prize: '메가커피 기프티콘',
  sponsorId: 'a',
  sponsorName: 'A',
  status: 'open',
  achieverId: null,
  achievedAt: null,
  paidAt: null,
  createdAt: '2025-03-01T00:00:00.000Z',
  updatedAt: '2025-03-01T00:00:00.000Z',
};

describe('서버 데이터 스냅샷', () => {
  beforeEach(() => localStorage.clear());

  it('저장하고 다시 읽는다', () => {
    expect(readSnapshot()).toBeNull();
    writeSnapshot({ members: [member], games: [game], sponsors: [sponsor] });
    expect(readSnapshot()).toEqual({ members: [member], games: [game], sponsors: [sponsor] });
  });

  it('후원 기능 이전에 저장한 스냅샷은 후원 없이 읽는다', () => {
    localStorage.setItem('mahjong.remoteSnapshot', JSON.stringify({ members: [member], games: [game] }));
    expect(readSnapshot()).toEqual({ members: [member], games: [game], sponsors: [] });
  });

  it('null 을 쓰면 지운다', () => {
    writeSnapshot({ members: [member], games: [], sponsors: [] });
    writeSnapshot(null);
    expect(readSnapshot()).toBeNull();
  });

  it('깨진 값이나 저장소가 없으면 null', () => {
    localStorage.setItem('mahjong.remoteSnapshot', '{broken');
    expect(readSnapshot()).toBeNull();
    localStorage.setItem('mahjong.remoteSnapshot', JSON.stringify({ members: [] }));
    expect(readSnapshot()).toBeNull();
    expect(readSnapshot(null)).toBeNull();
    expect(() => writeSnapshot({ members: [], games: [], sponsors: [] }, null)).not.toThrow();
  });
});
