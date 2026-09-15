import type { GameType, ScoringRules } from '../config/rules';

export interface Member {
  id: string;
  name: string;
  /** 아바타 파일명 (public/images/avatars/ 기준). 비어 있으면 `<id>.png` */
  avatar?: string | null;
  active: boolean;
  createdAt: string;
}

export interface Game {
  id: string;
  /** 대국 일시 (ISO 문자열) */
  playedAt: string;
  title: string;
  playerCount: number;
  gameType: GameType;
  /** 참가자 ID (입력 순서 유지 — 동점 시 앞쪽이 상위) */
  playerIds: string[];
  /** 참가자별 최종 원점수 (playerIds 와 같은 순서) */
  scores: number[];
  memo: string;
  createdAt: string;
  /** 저장 당시 적용된 정산 규칙 */
  rules: ScoringRules;
}

export type NewMember = Pick<Member, 'name' | 'avatar'> & Partial<Pick<Member, 'id' | 'active'>>;
export type MemberPatch = Partial<Pick<Member, 'name' | 'avatar' | 'active'>>;
export type NewGame = Omit<Game, 'id' | 'createdAt'>;
