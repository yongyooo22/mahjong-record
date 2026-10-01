import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openStorage, RemoteStorageAdapter, type StorageAdapter } from '../lib/storage';
import { readSnapshot, writeSnapshot } from '../lib/storage/snapshot';
import type { Game, Member, MemberPatch, NewGame, NewMember, NewSponsor, Sponsor, SponsorPatch } from '../lib/types';

type Status = 'loading' | 'ready' | 'error';

interface DataContextValue {
  status: Status;
  error: string | null;
  storageKind: 'remote' | 'local' | null;
  members: Member[];
  games: Game[];
  sponsors: Sponsor[];
  /** 이 기기에 저장해 둔 데이터를 보여 주면서 서버의 최신 데이터를 받는 중 */
  syncing: boolean;
  retry: () => void;
  addGame: (input: NewGame) => Promise<Game>;
  deleteGame: (id: string) => Promise<void>;
  addMember: (input: NewMember) => Promise<Member>;
  updateMember: (id: string, patch: MemberPatch) => Promise<Member>;
  addSponsor: (input: NewSponsor) => Promise<Sponsor>;
  updateSponsor: (id: string, patch: SponsorPatch) => Promise<Sponsor>;
  deleteSponsor: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 멤버·대국·후원 데이터를 한 곳에서 관리합니다.
 * 화면 컴포넌트는 useData() 만 사용하고, 저장소 구현은 알지 못합니다.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const storageRef = useRef<StorageAdapter | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [storageKind, setStorageKind] = useState<'remote' | 'local' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    // 지난번에 서버에서 받은 데이터가 있으면 바로 보여 주고, 최신 데이터는 뒤에서 받아 바꿔 끼웁니다.
    const snapshot = attempt === 0 ? readSnapshot() : null;
    if (snapshot) {
      storageRef.current = new RemoteStorageAdapter();
      setStorageKind('remote');
      setMembers(snapshot.members);
      setGames(snapshot.games);
      setSponsors(snapshot.sponsors);
      setStatus('ready');
      setSyncing(true);
    } else {
      setStatus('loading');
    }
    (async () => {
      try {
        const { storage, members: m, games: g, sponsors: sp } = await openStorage();
        if (cancelled) return;
        storageRef.current = storage;
        setStorageKind(storage.kind);
        setMembers(m);
        setGames(g);
        setSponsors(sp);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        // 저장해 둔 데이터를 보여 주는 중이면 그대로 둡니다 (저장·삭제는 서버 요청이라 실패하면 그때 알려 줌).
        if (snapshot) return;
        setError(errorMessage(err));
        setStatus('error');
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // 서버 데이터가 바뀔 때마다 다음 접속용으로 저장합니다. localStorage 저장소면 원본이 이미 이 기기에 있으므로 지웁니다.
  useEffect(() => {
    if (status !== 'ready' || syncing) return;
    writeSnapshot(storageKind === 'remote' ? { members, games, sponsors } : null);
  }, [status, syncing, storageKind, members, games, sponsors]);

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

  const addSponsor = useCallback(async (input: NewSponsor) => {
    const sponsor = await storage().addSponsor(input);
    setSponsors((prev) => [sponsor, ...prev]);
    return sponsor;
  }, []);

  const updateSponsor = useCallback(async (id: string, patch: SponsorPatch) => {
    const sponsor = await storage().updateSponsor(id, patch);
    setSponsors((prev) => prev.map((s) => (s.id === id ? sponsor : s)));
    return sponsor;
  }, []);

  const deleteSponsor = useCallback(async (id: string) => {
    await storage().deleteSponsor(id);
    setSponsors((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      error,
      storageKind,
      members,
      games,
      sponsors,
      syncing,
      retry,
      addGame,
      deleteGame,
      addMember,
      updateMember,
      addSponsor,
      updateSponsor,
      deleteSponsor,
    }),
    [status, error, storageKind, members, games, sponsors, syncing, retry, addGame, deleteGame, addMember, updateMember, addSponsor, updateSponsor, deleteSponsor],
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
