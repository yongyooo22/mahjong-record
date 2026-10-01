import { describe, expect, it } from 'vitest';
import { groupSponsors, recentAchievement, sponsorDisplayName } from './sponsors';
import type { Member, Sponsor } from './types';

function sponsor(id: string, patch: Partial<Sponsor> = {}): Sponsor {
  return {
    id,
    title: id,
    condition: '',
    prize: '상품',
    sponsorId: null,
    sponsorName: '후원자',
    status: 'open',
    achieverId: null,
    achievedAt: null,
    paidAt: null,
    repeat: false,
    achievements: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...patch,
  };
}

const NOW = new Date('2026-10-01T06:00:00.000Z');

describe('후원 목록', () => {
  it('상태별로 나누고 진행 중은 등록순, 달성·지급 완료는 최근 달성순으로 정렬한다', () => {
    const groups = groupSponsors([
      sponsor('old', { createdAt: '2026-08-01T00:00:00.000Z' }),
      sponsor('new', { createdAt: '2026-09-20T00:00:00.000Z' }),
      sponsor('a1', { status: 'achieved', achieverId: 'm', achievedAt: '2026-09-10T00:00:00.000Z' }),
      sponsor('a2', { status: 'achieved', achieverId: 'm', achievedAt: '2026-09-25T00:00:00.000Z' }),
      sponsor('p1', { status: 'paid', achieverId: 'm', achievedAt: '2026-07-01T00:00:00.000Z', paidAt: '2026-07-02T00:00:00.000Z' }),
    ]);
    expect(groups.open.map((s) => s.id)).toEqual(['old', 'new']);
    expect(groups.achieved.map((s) => s.id)).toEqual(['a2', 'a1']);
    expect(groups.paid.map((s) => s.id)).toEqual(['p1']);
  });

  it('최근 달성: 지급 대기는 언제 달성했든, 지급 완료는 30일 안에 달성한 것만', () => {
    expect(recentAchievement([sponsor('open')], NOW)).toBeNull();

    const oldPaid = sponsor('oldPaid', { status: 'paid', achieverId: 'm', achievedAt: '2026-08-01T00:00:00.000Z', paidAt: '2026-08-02T00:00:00.000Z' });
    expect(recentAchievement([oldPaid], NOW)).toBeNull();

    const recentPaid = sponsor('recentPaid', { status: 'paid', achieverId: 'm', achievedAt: '2026-09-20T00:00:00.000Z', paidAt: '2026-09-21T00:00:00.000Z' });
    expect(recentAchievement([oldPaid, recentPaid], NOW)?.sponsor.id).toBe('recentPaid');

    const oldWaiting = sponsor('oldWaiting', { status: 'achieved', achieverId: 'm', achievedAt: '2026-06-01T00:00:00.000Z' });
    expect(recentAchievement([oldPaid, oldWaiting], NOW)?.sponsor.id).toBe('oldWaiting');
    // 더 최근에 달성한 것이 우선
    expect(recentAchievement([oldWaiting, recentPaid], NOW)?.sponsor.id).toBe('recentPaid');
  });

  it('사람마다 달성하는 후원은 사람마다 최근 달성으로 센다', () => {
    const each = sponsor('each', {
      repeat: true,
      achievements: [
        { memberId: 'a', achievedAt: '2026-09-20T00:00:00.000Z', paidAt: '2026-09-21T00:00:00.000Z' },
        { memberId: 'b', achievedAt: '2026-09-25T00:00:00.000Z', paidAt: null },
      ],
    });
    const recent = recentAchievement([each], NOW);
    expect(recent).toMatchObject({ memberId: 'b', paid: false });
    expect(recent?.sponsor.id).toBe('each');
    expect(groupSponsors([each]).open.map((s) => s.id)).toEqual(['each']);
  });

  it('후원자 이름은 멤버면 지금 이름, 아니면 저장된 이름', () => {
    const members = new Map<string, Member>([['m', { id: 'm', name: '바뀐이름', avatar: null, active: true, createdAt: '' }]]);
    expect(sponsorDisplayName(sponsor('a', { sponsorId: 'm', sponsorName: '옛이름' }), members)).toBe('바뀐이름');
    expect(sponsorDisplayName(sponsor('b', { sponsorId: 'gone', sponsorName: '옛이름' }), members)).toBe('옛이름');
    expect(sponsorDisplayName(sponsor('c', { sponsorName: '사장님' }), members)).toBe('사장님');
  });
});
