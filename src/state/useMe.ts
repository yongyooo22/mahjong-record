import { useCallback, useEffect, useState } from 'react';
import { useData } from './DataProvider';

const ME_KEY = 'mahjong.me';

function readMe(): string | null {
  try {
    return window.localStorage.getItem(ME_KEY);
  } catch {
    return null;
  }
}

/**
 * 로그인이 없으므로 "나"는 이 기기에서 고른 멤버입니다 (localStorage 에 기억).
 * 고른 적이 없으면 첫 번째 활성 멤버를 사용합니다.
 */
export function useMe() {
  const { members } = useData();
  const [stored, setStored] = useState<string | null>(() => readMe());

  useEffect(() => {
    if (stored && !members.some((m) => m.id === stored) && members.length > 0) {
      // 저장된 멤버가 사라졌으면 초기화
      setStored(null);
    }
  }, [members, stored]);

  const me = (stored && members.find((m) => m.id === stored)) || members.find((m) => m.active) || members[0] || null;

  const setMe = useCallback((id: string) => {
    setStored(id);
    try {
      window.localStorage.setItem(ME_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  return { me, setMe, isExplicit: stored !== null && stored === me?.id };
}
