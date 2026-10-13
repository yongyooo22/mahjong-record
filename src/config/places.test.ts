import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PLACES, mergePlaces, readCustomPlaces, saveCustomPlace } from './places';

describe('대국 장소', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('기본 → 기록에 쓰인 곳 → 이 기기에서 추가한 곳 순서로 합치고 중복·공백은 뺀다', () => {
    expect(mergePlaces(['이수마장', ' 홍대 ', ''], ['홍대', '강남'])).toEqual([...DEFAULT_PLACES, '홍대', '강남']);
  });

  it('추가한 장소는 이 기기에 남고, 다시 추가하면 맨 뒤로 간다', () => {
    expect(readCustomPlaces()).toEqual([]);
    saveCustomPlace('홍대');
    saveCustomPlace('강남');
    saveCustomPlace('홍대');
    expect(readCustomPlaces()).toEqual(['강남', '홍대']);
  });

  it('깨진 저장값은 빈 목록으로 읽는다', () => {
    window.localStorage.setItem('mahjong.places', '{not json');
    expect(readCustomPlaces()).toEqual([]);
    window.localStorage.setItem('mahjong.places', JSON.stringify([1, '', '  ', '홍대']));
    expect(readCustomPlaces()).toEqual(['홍대']);
  });
});
