import { ChevronRight, Gift, PartyPopper } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/Card';
import { formatDateShortYear } from '../lib/format';
import { groupSponsors, recentAchievement, SPONSOR_STATUS_LABEL, sponsorDisplayName } from '../lib/sponsors';
import type { Sponsor, SponsorStatus } from '../lib/types';
import { useMemberMap } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import s from './Sponsors.module.css';

/*
 * 후원 화면 조각들 — 홈의 후원 현황 카드와 후원 화면(/sponsors)이 함께 씁니다.
 */

/** 홈에 보여 줄 진행 중 후원 수 (나머지는 '외 N개의 후원 보기') */
const HOME_SPONSOR_LIMIT = 2;

const chipClass: Record<SponsorStatus, string> = {
  open: s.chipOpen,
  achieved: s.chipAchieved,
  paid: s.chipPaid,
};

/** 후원 상태 칩: 진행 중 / 달성 / 지급 완료 */
export function SponsorStatusChip({ status }: { status: SponsorStatus }) {
  return <span className={[s.chip, chipClass[status]].join(' ')}>{SPONSOR_STATUS_LABEL[status]}</span>;
}

/** 달성한 후원의 상품 지급 여부: 지급 대기 / 지급 완료 */
export function PayoutChip({ status }: { status: SponsorStatus }) {
  const paid = status === 'paid';
  return <span className={[s.chip, paid ? s.chipPaid : s.chipWaiting].join(' ')}>{paid ? '지급 완료' : '지급 대기'}</span>;
}

/**
 * 홈의 후원 현황 카드 (최근 대국 아래, 홈 맨 아래). 카드 전체가 /sponsors 로 가는 링크입니다.
 * - 진행 중 후원은 최대 2개, 더 있으면 '외 N개의 후원 보기'
 * - 최근 달성한 후원이 있으면 맨 아래 한 줄 (지급 대기 / 지급 완료)
 * - 진행 중 후원이 없어도 후원 화면으로 가는 입구라서 한 줄짜리로 남겨 둡니다.
 */
export function HomeSponsorCard({ sponsors }: { sponsors: Sponsor[] }) {
  const memberMap = useMemberMap();
  const open = useMemo(() => groupSponsors(sponsors).open, [sponsors]);
  const recent = useMemo(() => recentAchievement(sponsors), [sponsors]);
  const shown = open.slice(0, HOME_SPONSOR_LIMIT);
  const more = open.length - shown.length;

  return (
    <Link to="/sponsors" className={[ui.card, s.homeCard].join(' ')}>
      <SectionHeader
        icon={<Gift size={18} />}
        title={
          <>
            후원 현황
            {open.length > 0 && <span className={s.countBadge}>진행 중 {open.length}개</span>}
          </>
        }
        right={<ChevronRight size={16} />}
      />

      {shown.length === 0 ? (
        <p className={s.homeEmpty}>현재 진행 중인 후원이 없어요.</p>
      ) : (
        <ul className={s.homeList}>
          {shown.map((sp) => (
            <li key={sp.id} className={s.homeItem}>
              <div className={s.homeItemHead}>
                <span className={s.homeItemTitle}>{sp.title}</span>
                <SponsorStatusChip status={sp.status} />
              </div>
              <div className={s.homeItemMeta}>
                {sp.prize} · 후원 {sponsorDisplayName(sp, memberMap)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {more > 0 && (
        <div className={s.homeMore}>
          외 {more}개의 후원 보기 <ChevronRight size={14} />
        </div>
      )}

      {recent && (
        // 최근 달성 한 줄: '🎉 1호 역만 · 주소원 · 9월 28일 [지급 대기]'.
        // 폰 폭(360~390px)에 한 줄로 들어가도록 '최근 달성' 글자는 화면 낭독기에만 읽히게 두고,
        // 그래도 모자라면 제목·이름을 말줄임합니다 (날짜·지급 여부는 항상 보이게).
        <div className={s.recent}>
          <PartyPopper size={14} className={s.recentIcon} aria-hidden="true" />
          <span className="visually-hidden">최근 달성:</span>
          <span className={s.recentText}>
            <b className={s.recentTitle}>{recent.title}</b>
            <span className={s.recentName}>{memberMap.get(recent.achieverId ?? '')?.name ?? '?'}</span>
            {recent.achievedAt && <span className={s.recentDate}>{formatDateShortYear(recent.achievedAt)}</span>}
          </span>
          <PayoutChip status={recent.status} />
        </div>
      )}
    </Link>
  );
}
