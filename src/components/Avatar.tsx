import { useEffect, useState } from 'react';
import { avatarUrl } from '../config/images';
import type { Member } from '../lib/types';
import s from './ui.module.css';

/** 로드에 실패한 URL 을 기억해서 화면 전환 시 깜빡임을 줄입니다. */
const failed = new Set<string>();

interface Props {
  member: Pick<Member, 'id' | 'name' | 'avatar'>;
  size?: number;
  className?: string;
  /** 이미지 표시 여부가 바뀔 때 알려줍니다 (레이아웃 조정용) */
  onLoadState?: (visible: boolean) => void;
}

/**
 * 원형 아바타. 이미지가 없거나 로드에 실패하면 아무것도 그리지 않습니다
 * (이니셜이나 대체 그림 없이 영역 자체를 숨김).
 */
export function Avatar({ member, size = 40, className, onLoadState }: Props) {
  const url = avatarUrl(member);
  const [error, setError] = useState(() => failed.has(url));
  useEffect(() => {
    onLoadState?.(!error);
  }, [error, onLoadState]);
  if (error) return null;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={[s.avatar, className ?? ''].join(' ')}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
      onError={() => {
        failed.add(url);
        setError(true);
      }}
    />
  );
}
