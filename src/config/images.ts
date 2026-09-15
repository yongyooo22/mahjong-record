/**
 * 이미지 경로 규칙을 한 곳에서 관리합니다.
 * 실제 이미지 파일은 GitHub 저장소의 public/images/ 아래에 직접 넣어 주세요.
 *
 *   public/images/mascot/home.png     → 홈 화면 히어로 마스코트
 *   public/images/mascot/record.png   → 대국 기록 화면 마스코트
 *   public/images/avatars/*.png       → 멤버 아바타 후보 (멤버 화면에서 골라서 지정)
 */
import avatarFiles from 'virtual:avatar-files';

export const IMAGE_BASE = '/images';

export const MASCOT_IMAGES = {
  home: `${IMAGE_BASE}/mascot/home.png`,
  record: `${IMAGE_BASE}/mascot/record.png`,
} as const;

export type MascotKey = keyof typeof MASCOT_IMAGES;

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
