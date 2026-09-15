/**
 * 이미지 경로 규칙을 한 곳에서 관리합니다.
 * 실제 이미지 파일은 GitHub 저장소의 public/images/ 아래에 직접 넣어 주세요.
 *
 *   public/images/logo.png            → 홈 왼쪽 위 로고 (정사각형, 투명 배경 권장). 없으면 發 패 그림을 그립니다
 *   public/images/bg/home.webp        → 홈 화면 상단 배경 (가로 2:1)
 *   public/images/bg/record.webp      → 대국 기록 화면 상단 배경 (가로 2:1)
 *   public/images/mascot/home.png     → 홈 화면 마스코트 (투명 배경 PNG)
 *   public/images/mascot/record.png   → 대국 기록 화면 마스코트 (투명 배경 PNG)
 *   public/images/avatars/*.png       → 멤버 아바타 후보 (멤버 화면에서 골라서 지정)
 */
import avatarFiles from 'virtual:avatar-files';

export const IMAGE_BASE = '/images';

/** 홈 왼쪽 위 로고. 파일이 없으면 기본 發 패 로고로 대체됩니다. */
export const LOGO_IMAGE = `${IMAGE_BASE}/logo.png`;

export const MASCOT_IMAGES = {
  home: `${IMAGE_BASE}/mascot/home.png`,
  record: `${IMAGE_BASE}/mascot/record.png`,
} as const;

export type MascotKey = keyof typeof MASCOT_IMAGES;

/** 녹색 헤더 뒤에 깔리는 배경 그림. 없거나 못 불러오면 기존 녹색 그라데이션만 보입니다. */
export const BG_IMAGES = {
  home: `${IMAGE_BASE}/bg/home.webp`,
  record: `${IMAGE_BASE}/bg/record.webp`,
} as const;

/** 헤더에 배경 그림을 까는 inline style (CSS 변수로 전달) */
export function headerBgStyle(key: keyof typeof BG_IMAGES): React.CSSProperties {
  return { ['--header-bg' as string]: `url(${BG_IMAGES[key]})` };
}

export const AVATAR_DIR = `${IMAGE_BASE}/avatars`;

/** 멤버가 실제로 사용하는 아바타 파일명. avatar 필드가 비어 있으면 `<memberId>.png` */
export function avatarFile(member: { id: string; avatar?: string | null }): string {
  return member.avatar && member.avatar.trim() ? member.avatar.trim() : `${member.id}.png`;
}

/** 멤버 아바타 URL */
export function avatarUrl(member: { id: string; avatar?: string | null }): string {
  return `${AVATAR_DIR}/${avatarFile(member)}`;
}

export interface AvatarOption {
  /** 파일명 (멤버의 avatar 필드에 저장되는 값) */
  file: string;
  url: string;
}

/** 멤버 화면에서 고를 수 있는 아바타 목록 (public/images/avatars/ 의 PNG, 빌드 시 자동 수집 — vite.avatarFiles.ts) */
export const AVATAR_OPTIONS: AvatarOption[] = avatarFiles.map((file) => ({ file, url: `${AVATAR_DIR}/${file}` }));
