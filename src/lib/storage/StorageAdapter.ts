import type { Game, Member, MemberPatch, NewGame, NewMember } from '../types';

/**
 * 화면 컴포넌트는 이 인터페이스만 사용합니다.
 * 구현체: RemoteStorage (/api/*), LocalStorage (브라우저 localStorage)
 */
export interface StorageAdapter {
  readonly kind: 'remote' | 'local';
  listMembers(): Promise<Member[]>;
  addMember(input: NewMember): Promise<Member>;
  updateMember(id: string, patch: MemberPatch): Promise<Member>;
  listGames(): Promise<Game[]>;
  addGame(input: NewGame): Promise<Game>;
  deleteGame(id: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
