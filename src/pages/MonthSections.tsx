import { Coins, Dices, Flame, Sparkles, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Delta } from '../components/Delta';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { StatCard, StatGrid, type StatVariant } from '../components/StatCard';
import { GAME_TYPE_LABEL } from '../config/rules';
import { formatAvgRank, formatDateShort, formatWeekday } from '../lib/format';
import { computeResults, formatPoints } from '../lib/scoring';
import type { GroupSummary, RankingRow, TopMember } from '../lib/stats';
import type { Game } from '../lib/types';
import { useMemberMap } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import s from './Home.module.css';

/*
 * 한 달 모임 현황을 이루는 조각들 — 홈(이번 달)과 월별 현황 화면(명예의 전당에서 들어옴)이 함께 씁니다.
 */

/**
 * 이름을 값으로 쓰는 통계 카드 값 (최다 참여 / 누적 우마 1위 / 평균 우마 1위).
 * 동률이면 이름을 모두 나열합니다 (여러 줄로 줄바꿈).
 */
function NameStat({ top }: { top: TopMember | null }) {
  const memberMap = useMemberMap();
  if (!top) return <span className={ui.statValueText}>-</span>;
  const names = top.memberIds.map((id) => memberMap.get(id)?.name ?? '?');
  if (names.length === 1) return <span className={ui.statValueText}>{names[0]}</span>;
  return <span className={[ui.statValueText, ui.statValueTie].join(' ')}>{names.join(' · ')}</span>;
}

/**
 * compact 칸의 이름 값: 이름 옆에 수치를 붙입니다 (예: 오영식 4국). 긴 이름은 말줄임.
 * 두 명이 동률이면 한 줄에 한 명씩 두 줄로, 셋 이상이면 'OOO 외 N명' (그 달 참여자 전원이면 '전원').
 */
function CompactNameStat({ top, extra }: { top: TopMember | null; extra: (value: number) => ReactNode }) {
  const memberMap = useMemberMap();
  if (!top) return <>-</>;
  const names = top.memberIds.map((id) => memberMap.get(id)?.name ?? '?');
  const lines = names.length <= 2 ? names : [names.length === top.candidates ? '전원' : `${names[0]} 외 ${names.length - 1}명`];
  return (
    <span className={lines.length > 1 ? ui.statCompactTie : undefined} title={names.length > 1 ? names.join(', ') : undefined}>
      {lines.map((line, i) => (
        <span key={i} className={ui.statCompactName}>
          <span className={ui.statCompactNames}>{line}</span>
          {i === lines.length - 1 && <span className={ui.statCompactExtra}>{extra(top.value)}</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * 대국 수 · 최다 참여 · 누적 우마 1위 · 평균 우마 1위 (2×2).
 * - default: 카드 4장 (월별 현황)
 * - compact: 카드 한 장에 담은 작은 형태 (홈). 이름 옆에 수치를 붙이고, '아직 없음'·'지난달 기록 없음' 같은 보조 문구는 뺍니다.
 *   to 를 주면 카드 전체가 링크가 됩니다.
 */
export function MonthStatGrid({ summary, gamesLabel, variant = 'default', to }: { summary: GroupSummary; gamesLabel: string; variant?: StatVariant; to?: string }) {
  const compact = variant === 'compact';
  const iconSize = compact ? 15 : 18;
  return (
    <StatGrid variant={variant} to={to}>
      <StatCard
        variant={variant}
        icon={<Dices size={iconSize} color="#075844" />}
        tone="#e4efe9"
        label={gamesLabel}
        value={
          <>
            {summary.games.current ?? 0}
            <small>국</small>
          </>
        }
        sub={compact && summary.games.delta === null ? undefined : <Delta delta={summary.games.delta} digits={0} />}
      />
      <StatCard
        variant={variant}
        icon={<Flame size={iconSize} color="#075844" />}
        tone="#e4efe9"
        label="최다 참여"
        value={compact ? <CompactNameStat top={summary.mostActive} extra={(v) => `${v}국`} /> : <NameStat top={summary.mostActive} />}
        sub={compact ? undefined : summary.mostActive ? `${summary.mostActive.value}국 참여` : '아직 없음'}
      />
      <StatCard
        variant={variant}
        icon={<Coins size={iconSize} color="#075844" />}
        tone="#e4efe9"
        label="누적 우마 1위"
        value={compact ? <CompactNameStat top={summary.bestTotal} extra={(v) => <Points value={v} />} /> : <NameStat top={summary.bestTotal} />}
        sub={compact ? undefined : summary.bestTotal ? `누적 ${formatPoints(summary.bestTotal.value)}` : '아직 없음'}
      />
      <StatCard
        variant={variant}
        icon={<TrendingUp size={iconSize} color="#075844" />}
        tone="#e4efe9"
        label="평균 우마 1위"
        value={compact ? <CompactNameStat top={summary.bestAverage} extra={(v) => <Points value={v} />} /> : <NameStat top={summary.bestAverage} />}
        sub={compact ? undefined : summary.bestAverage ? `대국당 ${formatPoints(summary.bestAverage.value)}` : '아직 없음'}
      />
    </StatGrid>
  );
}

/** 랭킹 줄 (1위에 MVP 표시) */
export function MonthRankingRows({ ranking }: { ranking: RankingRow[] }) {
  return (
    <>
      {ranking.map((row) => (
        <div key={row.member.id} className={s.rankRow}>
          <RankBadge rank={row.position} pill />
          <Avatar member={row.member} size={34} />
          <div className={s.rankName}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.member.name}</span>
            {row.position === 1 && <span className={s.mvp}>MVP</span>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Points value={row.totalPoints} className={s.rankPoints} />
            <div className={s.rankGames}>
              {row.games}국 · 평균 {formatAvgRank(row.avgRank)}위
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/** 대국 줄 (날짜 · 장소 · 방식 · 역만 · 순위별 참가자). 누르면 대국 상세로 */
export function GameRows({ games }: { games: Game[] }) {
  const memberMap = useMemberMap();
  return (
    <>
      {games.map((g) => {
        const results = computeResults(g.scores, g.rules, g.gameType);
        const ordered = [...results].sort((a, b) => a.rank - b.rank);
        return (
          <Link key={g.id} to={`/games/${g.id}`} className={s.recent}>
            <div className={s.recentDate}>
              <strong>{formatDateShort(g.playedAt)}</strong>
              {formatWeekday(g.playedAt)}
            </div>
            <div className={s.recentBody}>
              <div className={s.recentTitle}>
                {g.place || '장소 미정'}
                <span className={s.recentType}>{GAME_TYPE_LABEL[g.gameType]}</span>
                {g.yakumans.length > 0 && (
                  <span className={s.recentYakuman}>
                    <Sparkles size={11} /> 역만
                  </span>
                )}
              </div>
              <div className={s.recentPlayers}>
                {ordered.map((r) => (
                  <span key={r.index} className={s.recentPlayer}>
                    <RankBadge rank={r.rank} size="sm" />
                    <span>{memberMap.get(g.playerIds[r.index])?.name ?? '?'}</span>
                  </span>
                ))}
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
