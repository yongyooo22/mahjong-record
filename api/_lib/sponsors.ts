import type { Member, NewSponsor, Sponsor, SponsorAchievement, SponsorStatus } from '../../src/lib/types';

export const SPONSOR_STATUSES: readonly SponsorStatus[] = ['open', 'achieved', 'paid'];
export const SPONSOR_TITLE_MAX = 30;
export const SPONSOR_CONDITION_MAX = 200;
export const SPONSOR_PRIZE_MAX = 40;
export const SPONSOR_NAME_MAX = 20;
export const SPONSOR_ACHIEVEMENTS_MAX = 50;

/** 후원 입력이 올바르지 않을 때. 서버는 400 으로, localStorage 저장소는 StorageError 로 바꿔 알립니다. */
export class SponsorInputError extends Error {}

function text(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function id(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** 날짜 입력 → ISO. 비어 있으면 null, 값이 있는데 날짜가 아니면 오류 */
function date(v: unknown, label: string): string | null {
  if (v == null || v === '') return null;
  const d = typeof v === 'string' ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) throw new SponsorInputError(`${label}이 올바르지 않습니다.`);
  return d.toISOString();
}

/**
 * 후원 입력을 검증해 저장할 값으로 맞춥니다. 서버(/api/sponsors)와 localStorage 저장소가 함께 씁니다.
 * - current 가 있으면(수정) 입력에 없는 필드는 기존 값을 그대로 씁니다.
 * - 후원자를 멤버로 고르면 이름은 그 멤버의 지금 이름으로 맞춥니다.
 * - 진행 중이면 달성자·달성일·지급일을 비우고, 달성·지급 완료면 달성한 멤버가 꼭 있어야 합니다.
 *   달성일·지급일이 비어 있으면 지금 시각을 씁니다.
 */
export function buildSponsorFields(
  input: Record<string, unknown>,
  current: Sponsor | null,
  members: ReadonlyArray<Pick<Member, 'id' | 'name'>>,
  now: Date = new Date(),
): NewSponsor {
  const pick = (key: keyof NewSponsor): unknown => (input[key] !== undefined ? input[key] : current?.[key]);
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  const title = text(pick('title'), SPONSOR_TITLE_MAX);
  if (!title) throw new SponsorInputError('제목을 입력해 주세요.');
  const prize = text(pick('prize'), SPONSOR_PRIZE_MAX);
  if (!prize) throw new SponsorInputError('상품을 입력해 주세요.');
  const condition = text(pick('condition'), SPONSOR_CONDITION_MAX);

  const sponsorId = id(pick('sponsorId'));
  if (sponsorId && !memberName.has(sponsorId)) throw new SponsorInputError('후원자가 등록되지 않은 멤버입니다.');
  const sponsorName = sponsorId ? text(memberName.get(sponsorId), SPONSOR_NAME_MAX) : text(pick('sponsorName'), SPONSOR_NAME_MAX);
  if (!sponsorName) throw new SponsorInputError('후원자를 입력해 주세요.');

  // 사람마다 달성하는 후원은 늘 진행 중이고, 달성 기록은 achievements 에 쌓입니다.
  if (pick('repeat') === true) {
    const achievements = buildAchievements(pick('achievements'), memberName, now);
    return { title, condition, prize, sponsorId, sponsorName, status: 'open', achieverId: null, achievedAt: null, paidAt: null, repeat: true, achievements };
  }

  const status = pick('status') ?? 'open';
  if (!SPONSOR_STATUSES.includes(status as SponsorStatus)) throw new SponsorInputError('후원 상태가 올바르지 않습니다.');
  const base = { title, condition, prize, sponsorId, sponsorName, repeat: false, achievements: [] };
  if (status === 'open') return { ...base, status, achieverId: null, achievedAt: null, paidAt: null };

  const achieverId = id(pick('achieverId'));
  if (!achieverId) throw new SponsorInputError('달성한 사람을 골라 주세요.');
  if (!memberName.has(achieverId)) throw new SponsorInputError('달성한 사람이 등록되지 않은 멤버입니다.');
  const achievedAt = date(pick('achievedAt'), '달성일') ?? now.toISOString();
  const paidAt = status === 'paid' ? (date(pick('paidAt'), '지급일') ?? now.toISOString()) : null;
  return { ...base, status: status as SponsorStatus, achieverId, achievedAt, paidAt };
}

/** 사람마다 달성 기록 검증: 등록된 멤버, 한 사람당 한 번, 달성일 없으면 지금 */
function buildAchievements(raw: unknown, memberName: Map<string, string>, now: Date): SponsorAchievement[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new SponsorInputError('달성 기록이 올바르지 않습니다.');
  if (raw.length > SPONSOR_ACHIEVEMENTS_MAX) throw new SponsorInputError(`달성 기록은 최대 ${SPONSOR_ACHIEVEMENTS_MAX}건까지예요.`);
  const seen = new Set<string>();
  return raw.map((item) => {
    const a = (item ?? {}) as Record<string, unknown>;
    const memberId = id(a.memberId);
    if (!memberId) throw new SponsorInputError('달성한 사람을 골라 주세요.');
    if (!memberName.has(memberId)) throw new SponsorInputError('달성한 사람이 등록되지 않은 멤버입니다.');
    if (seen.has(memberId)) throw new SponsorInputError('같은 사람이 두 번 달성할 수 없어요.');
    seen.add(memberId);
    return { memberId, achievedAt: date(a.achievedAt, '달성일') ?? now.toISOString(), paidAt: date(a.paidAt, '지급일') };
  });
}

/** 저장된 후원 레코드를 현재 스키마로 맞춥니다 (빠진 필드는 기본값). 서버와 localStorage 저장소가 함께 씁니다. */
export function normalizeSponsor(raw: Partial<Sponsor>): Sponsor {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const status = SPONSOR_STATUSES.includes(raw.status as SponsorStatus) ? (raw.status as SponsorStatus) : 'open';
  return {
    id: str(raw.id),
    title: str(raw.title),
    condition: str(raw.condition),
    prize: str(raw.prize),
    sponsorId: strOrNull(raw.sponsorId),
    sponsorName: str(raw.sponsorName),
    status,
    achieverId: status === 'open' ? null : strOrNull(raw.achieverId),
    achievedAt: status === 'open' ? null : strOrNull(raw.achievedAt),
    paidAt: status === 'paid' ? strOrNull(raw.paidAt) : null,
    // 사람마다 달성 기능 이전 기록에는 repeat·achievements 가 없습니다.
    repeat: raw.repeat === true,
    achievements:
      raw.repeat === true && Array.isArray(raw.achievements)
        ? raw.achievements.filter((a): a is SponsorAchievement => !!a && typeof a.memberId === 'string' && typeof a.achievedAt === 'string').map((a) => ({ ...a, paidAt: strOrNull(a.paidAt) }))
        : [],
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt) || str(raw.createdAt),
  };
}
