import { describe, expect, it } from 'vitest';
import { AVATAR_OPTIONS, avatarFile, avatarUrl } from './images';

describe('아바타 파일', () => {
  it('선택 목록은 public/images/avatars/ 의 WebP 파일', () => {
    expect(AVATAR_OPTIONS.length).toBeGreaterThan(0);
    expect(AVATAR_OPTIONS.every((o) => o.file.endsWith('.webp'))).toBe(true);
  });

  it('예전에 저장된 .png 이름과 기본값 <id>.png 는 같은 이름의 .webp 로 찾는다', () => {
    expect(avatarFile({ id: 'x', avatar: 'avatar_5.png' })).toBe('avatar_5.webp');
    expect(avatarFile({ id: 'yeonkyung', avatar: null })).toBe('yeonkyung.webp');
    expect(avatarUrl({ id: 'sowon' })).toBe('/images/avatars/sowon.webp');
  });

  it('파일이 없는 아바타는 요청하지 않도록 URL 이 null', () => {
    expect(avatarUrl({ id: 'guest', avatar: null })).toBeNull();
    expect(avatarUrl({ id: 'x', avatar: 'nope.png' })).toBeNull();
  });
});
