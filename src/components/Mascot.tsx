import { useState } from 'react';
import { MASCOT_IMAGES, type MascotKey } from '../config/images';

const failed = new Set<string>();

interface Props {
  name: MascotKey;
  className?: string;
  /** 이미지가 없을 때 대신 렌더링할 여백 요소의 클래스 (없으면 아무것도 그리지 않음) */
  fallbackClassName?: string;
}

/** 마스코트 이미지. 없으면 여백만 남깁니다. */
export function Mascot({ name, className, fallbackClassName }: Props) {
  const url = MASCOT_IMAGES[name];
  const [error, setError] = useState(() => failed.has(url));
  if (error) {
    return fallbackClassName ? <div className={fallbackClassName} aria-hidden="true" /> : null;
  }
  return (
    <img
      src={url}
      alt=""
      className={className}
      decoding="async"
      onError={() => {
        failed.add(url);
        setError(true);
      }}
    />
  );
}
