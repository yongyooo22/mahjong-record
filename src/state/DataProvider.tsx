import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createStorage, type StorageAdapter } from '../lib/storage';
import type { Game, Member, MemberPatch, NewGame, NewMember } from '../lib/types';

type Status = 'loading' | 'ready' | 'error';

interface DataContextValue {
  status: Status;
  error: string | null;
  storageKind: 'remote' | 'local' | null;
  members: Member[];
  games: Game[];
  retry: () => void;
  addGame: (input: NewGame) => Promise<Game>;
  deleteGame: (id: string) => Promise<void>;
  addMember: (input: NewMember) => Promise<Member>;
  updateMember: (id: string, patch: MemberPatch) => Promise<Member>;
}

const DataContext = createContext<DataContextValue | null>(null);

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 멤버·대국 데이터를 한 곳에서 관리합니다.
 * 화면 컴포넌트는 useData() 만 사용하고, 저장소 구현은 알지 못합니다.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const storageRef = useRef<StorageAdapter | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [storageKind, setStorageKind] = useState<'remote' | 'local' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const storage = storageRef.current ?? (await createStorage());
        storageRef.current = storage;
        const [m, g] = await Promise.all([storage.listMembers(), storage.listGames()]);
        if (cancelled) return;
        setStorageKind(storage.kind);
        setMembers(m);
        setGames(g);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    storageRef.current = null;
    setAttempt((n) => n + 1);
  }, []);

  const storage = () => {
    const s = storageRef.current;
    if (!s) throw new Error('저장소가 아직 준비되지 않았습니다.');
    return s;
  };

  const addGame = useCallback(async (input: NewGame) => {
    const game = await storage().addGame(input);
    setGames((prev) => [...prev, game]);
    return game;
  }, []);

  const deleteGame = useCallback(async (id: string) => {
    await storage().deleteGame(id);
    setGames((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addMember = useCallback(async (input: NewMember) => {
    const member = await storage().addMember(input);
    setMembers((prev) => [...prev, member]);
    return member;
  }, []);

  const updateMember = useCallback(async (id: string, patch: MemberPatch) => {
    const member = await storage().updateMember(id, patch);
    setMembers((prev) => prev.map((m) => (m.id === id ? member : m)));
    return member;
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({ status, error, storageKind, members, games, retry, addGame, deleteGame, addMember, updateMember }),
    [status, error, storageKind, members, games, retry, addGame, deleteGame, addMember, updateMember],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData 는 DataProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

/** id → Member 맵 */
export function useMemberMap(): Map<string, Member> {
  const { members } = useData();
  return useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
}
