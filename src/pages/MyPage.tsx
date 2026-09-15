import { ChevronDown, Coins, Crown, FileText, PieChart, TrendingUp, UserRound, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card, SectionHeader } from '../components/Card';
import { Delta } from '../components/Delta';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { Segmented } from '../components/Segmented';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { StatCard, StatGrid } from '../components/StatCard';
import { formatAvgRank, formatDateShort, formatWeekday } from '../lib/format';
import { formatPoints, formatScore } from '../lib/scoring';
import { computeMemberStats, computeMonthlySummary, currentMonthKey, formatMonthKey, gamesForMember, gamesInMonth } from '../lib/stats';
import type { Member } from '../lib/types';
import { useData } from '../state/DataProvider';
import { useMe } from '../state/useMe';
import app from '../styles/App.module.css';
import pages from './Pages.module.css';
import s from './My.module.css';

/** 헤더 오른쪽 "나" 버튼: 아바타가 있으면 아바타만, 없으면 이름을 보여줍니다. */
function MeButton({ me, onClick }: { me: Member; onClick: () => void }) {
  const [hasAvatar, setHasAvatar] = useState(true);
  return (
    <button type="button" className={[s.meBtn, hasAvatar ? '' : s.meBtnNoAvatar].join(' ')} onClick={onClick} aria-label={`내 이름: ${me.name}, 변경`}>
      <Avatar member={me} size={28} onLoadState={setHasAvatar} />
      {!hasAvatar && <span className={s.meName}>{me.name}</span>}
      <ChevronDown size={14} />
    </button>
  );
}

const RANK_LABEL = ['1위', '2위', '3위', '4위(라스)'];

/**
 * 내 기록: 이 기기에서 고른 "나"의 개인 통계.
 * 로그인이 없으므로 각자 자기 폰에서 자기 이름을 한 번 고르면 됩니다.
 */
export function MyPage() {
  const navigate = useNavigate();
  const { status, error, retry, games, members } = useData();
  const { me, setMe, isExplicit } = useMe();
  const [pickOpen, setPickOpen] = useState(false);
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [month, setMonth] = useState(currentMonthKey());
  const maxMonth = currentMonthKey();

  const periodGames = useMemo(() => (mode === 'month' ? gamesInMonth(games, month) : games), [games, mode, month]);
  const monthly = useMemo(() => (me && mode === 'month' ? computeMonthlySummary(games, me.id, month) : null), [games, me, mode, month]);
  const stats = useMemo(() => (me ? computeMemberStats(periodGames, [me.id]).get(me.id)! : null), [periodGames, me]);
  const myGames = useMemo(() => (me ? gamesForMember(periodGames, me.id) : []), [periodGames, me]);

  const loading = status === 'loading';
  const periodLabel = mode === 'month' ? formatMonthKey(month) : '전체 기간';

  return (
    <>
      <PageHeader title="내 기록" right={me ? <MeButton me={me} onClick={() => setPickOpen(true)} /> : undefined} />
      <div className={app.page}>
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}

        {loading && <SkeletonRows rows={3} height={110} />}

        {status === 'ready' && !me && (
          <Card>
            <EmptyState
              icon={<Users size={24} />}
              title="멤버가 없어요"
              description="멤버를 먼저 추가하면 내 기록을 볼 수 있어요."
              action={
                <Button variant="outline" size="sm" onClick={() => navigate('/members')}>
                  멤버 추가하러 가기
                </Button>
              }
            />
          </Card>
        )}

        {status === 'ready' && me && (
          <>
            {/* 나 표시 + 변경 */}
            <Card className={s.meBanner} tight>
              <Avatar member={me} size={44} />
              <div className={s.meBannerBody}>
                <div className={s.meBannerName}>{me.name}</div>
                <div className={s.meBannerHint}>{isExplicit ? '이 기기에서 나로 기억돼요' : '아직 나를 고르지 않아 첫 멤버를 보여줘요'}</div>
              </div>
              <Button variant={isExplicit ? 'outline' : 'primary'} size="sm" icon={<UserRound size={16} />} onClick={() => setPickOpen(true)}>
                {isExplicit ? '변경' : '나 선택'}
              </Button>
            </Card>

            <div className={pages.filterBar}>
              <Segmented
                value={mode}
                onChange={setMode}
                ariaLabel="기간"
                options={[
                  { value: 'month', label: '월별' },
                  { value: 'all', label: '전체 기간' },
                ]}
              />
              {mode === 'month' ? <MonthPicker value={month} onChange={setMonth} max={maxMonth} /> : <span className={pages.filterHint}>총 {stats?.games ?? 0}국</span>}
            </div>

            {/* 통계 카드 */}
            <section>
              <div className={s.sectionMeta}>
                {periodLabel} <span>· {stats?.games ?? 0}국</span>
              </div>
              {!stats ? (
                <Skeleton height={118} />
              ) : (
                <StatGrid>
                  <StatCard
                    icon={<TrendingUp size={18} color="#075844" />}
                    tone="#e4efe9"
                    label="평균 순위"
                    value={formatAvgRank(stats.avgRank)}
                    sub={monthly ? <Delta delta={monthly.avgRank.delta} lowerIsBetter digits={1} /> : `${stats.games}국 기준`}
                  />
                  <StatCard
                    icon={<Crown size={18} color="#b9861f" />}
                    tone="#fbf0d0"
                    label="1위 횟수"
                    value={
                      <>
                        {stats.rankCounts[0]}
                        <small>회</small>
                      </>
                    }
                    sub={monthly ? <Delta delta={monthly.firstCount.delta} digits={0} /> : `1위율 ${stats.firstRate}%`}
                  />
                  <StatCard
                    icon={<span style={{ fontFamily: 'serif', fontWeight: 800, color: '#C83D32', fontSize: 16, lineHeight: 1 }}>中</span>}
                    tone="#fbeae8"
                    label="라스 횟수"
                    value={
                      <>
                        {stats.rankCounts[3]}
                        <small>회</small>
                      </>
                    }
                    sub={monthly ? <Delta delta={monthly.lastCount.delta} lowerIsBetter digits={0} /> : `${stats.games}국 중`}
                  />
                  <StatCard
                    icon={<Coins size={18} color="#075844" />}
                    tone="#e4efe9"
                    label="누적 우마"
                    value={<span className={stats.totalPoints > 0 ? 'pos' : stats.totalPoints < 0 ? 'neg' : ''}>{formatPoints(stats.totalPoints)}</span>}
                    sub={monthly ? <Delta delta={monthly.totalPoints.delta} digits={1} /> : '정산 점수 합계'}
                  />
                </StatGrid>
              )}
            </section>

            {/* 순위 분포 */}
            <Card>
              <SectionHeader icon={<PieChart size={18} />} title="순위 분포" right={periodLabel} />
              {!stats || stats.games === 0 ? (
                <EmptyState icon={<PieChart size={24} />} title="아직 대국이 없어요" description="대국을 기록하면 순위 분포가 보여요." />
              ) : (
                <div className={s.dist}>
                  {stats.rankCounts.map((count, i) => {
                    const pct = Math.round((count / stats.games) * 100);
                    return (
                      <div key={i} className={s.distRow}>
                        <span className={s.distLabel}>{RANK_LABEL[i]}</span>
                        <div className={s.distTrack}>
                          <div className={[s.distBar, s[`distBar${i + 1}`]].join(' ')} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={s.distValue}>
                          {count}회 <small>({pct}%)</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 내 대국 */}
            <Card>
              <SectionHeader icon={<FileText size={18} />} title="내 대국" right={`${myGames.length}국`} />
              {myGames.length === 0 ? (
                <EmptyState icon={<FileText size={24} />} title="참여한 대국이 없어요" description="이 기간에 내가 참여한 대국이 없어요." />
              ) : (
                myGames.slice(0, 30).map(({ game, rank, score, points }) => (
                  <Link key={game.id} to={`/games/${game.id}`} className={s.myGame}>
                    <div className={s.myGameDate}>
                      <strong>{formatDateShort(game.playedAt)}</strong>
                      {formatWeekday(game.playedAt)}
                    </div>
                    <div className={s.myGameBody}>
                      <div className={s.myGameTitle}>{game.title || '대국'}</div>
                      <div className={s.myGameScore}>{formatScore(score)}점</div>
                    </div>
                    <RankBadge rank={rank} size="sm" />
                    <Points value={points} className={s.myGamePoints} />
                  </Link>
                ))
              )}
              {myGames.length > 30 && <div className={s.moreHint}>최근 30국만 표시돼요. 전체는 기록 탭에서 볼 수 있어요.</div>}
            </Card>
          </>
        )}
      </div>

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="내 이름 선택">
        내 기록을 보여줄 멤버를 골라주세요. 이 기기에만 기억됩니다.
        <div className={s.meList}>
          {members
            .filter((m) => m.active || m.id === me?.id)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                className={[s.meItem, m.id === me?.id ? s.meItemActive : ''].join(' ')}
                onClick={() => {
                  setMe(m.id);
                  setPickOpen(false);
                }}
              >
                <Avatar member={m} size={30} />
                {m.name}
              </button>
            ))}
        </div>
      </Modal>
    </>
  );
}
