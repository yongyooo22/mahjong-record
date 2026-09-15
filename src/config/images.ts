/**
 * 이미지 경로 규칙을 한 곳에서 관리합니다.
 * 실제 이미지 파일은 GitHub 저장소의 public/images/ 아래에 직접 넣어 주세요.
 *
 *   public/images/mascot/home.png     → 홈 화면 히어로 마스코트
 *   public/images/mascot/record.png   → 대국 기록 화면 마스코트
 *   public/images/avatars/<memberId>.png → 멤버 아바타 (멤버의 avatar 필드로 파일명 변경 가능)
 */
export const IMAGE_BASE = '/images';

export const MASCOT_IMAGES = {
  home: `${IMAGE_BASE}/mascot/home.png`,
  record: `${IMAGE_BASE}/mascot/record.png`,
} as const;

export type MascotKey = keyof typeof MASCOT_IMAGES;

export const AVATAR_DIR = `${IMAGE_BASE}/avatars`;

/** 멤버 아바타 URL. avatar 필드가 비어 있으면 `<memberId>.png` 를 사용합니다. */
export function avatarUrl(member: { id: string; avatar?: string | null }): string {
  const file = member.avatar && member.avatar.trim() ? member.avatar.trim() : `${member.id}.png`;
  return `${AVATAR_DIR}/${file}`;
}

/** 멤버 화면에서 안내용으로 보여주는 상대 경로 */
export function avatarRepoPath(member: { id: string; avatar?: string | null }): string {
  return `public${avatarUrl(member)}`;
}
