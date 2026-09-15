import { Bell, ChevronDown, ChevronRight, Clock, Coins, Crown, Database, HardDrive, PenLine, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card, SectionHeader } from '../components/Card';
import { Delta } from '../components/Delta';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Mascot } from '../components/Mascot';
import { Modal } from '../components/Modal';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { Skeleton } from '../components/Skeleton';
import { formatAvgRank, formatDateShort, formatWeekday } from '../lib/format';
import { computeResults, formatPoints } from '../lib/scoring';
import { computeMonthlySummary, computeRanking, currentMonthKey, formatMonthKey, gamesInMonth, sortGamesDesc } from '../lib/stats';
import type { Member } from '../lib/types';
import { useData, useMemberMap } from '../state/DataProvider';
import { useMe } from '../state/useMe';
import app from '../styles/App.module.css';
import s from './Home.module.css';

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

function HomeHeader({ onPickMe }: { onPickMe: () => void }) {
  const { me } = useMe();
  return (
    <header className={app.header}>
      <div className={app.headerInner}>
        <div className={s.top}>
          <div className={s.logo} aria-hidden="true">
            發
          </div>
          <div className={s.titleBox}>
            <h1 className={s.appName}>마작 고수들의 모임</h1>
            <p className={s.subtitle}>좋은 패, 좋은 사람들.</p>
          </div>
          <button type="button" className={s.bell} aria-label="알림 (준비 중)">
            <Bell size={22} />
          </button>
          {me && <MeButton me={me} onClick={onPickMe} />}
        </div>
        <div className={s.hero}>
          <Mascot name="home" className={s.heroImg} fallbackClassName={s.heroEmpty} />
        </div>
      </div>
    </header>
  );
}

function StatCard({ icon, tone, label, value, delta }: { icon: React.ReactNode; tone: string; label: string; value: React.ReactNode; delta: React.ReactNode }) {
  return (
    <div className={s.stat}>
      <div className={s.statIcon} style={{ background: tone }}>
        {icon}
      </div>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      <div className={s.statDelta}>{delta}</div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { status, error, retry, games, members, storageKind } = useData();
  const memberMap = useMemberMap();
  const { me, setMe } = useMe();
  const [pickOpen, setPickOpen] = useState(false);
  const month = currentMonthKey();

  const summary = useMemo(() => (me ? computeMonthlySummary(games, me.id, month) : null), [games, me, month]);
  const ranking = useMemo(() => computeRanking(gamesInMonth(games, month), members), [games, members, month]);
  const recent = useMemo(() => sortGamesDesc(games).slice(0, 5), [games]);

  const loading = status === 'loading';

  return (
    <>
      <HomeHeader onPickMe={() => setPickOpen(true)} />
      <div className={s.ctaWrap}>
        <Button variant="primary" full decorated className={s.cta} onClick={() => navigate('/record')} disabled={status !== 'ready'}>
          <span className={s.ctaLabel}>
            <PenLine size={20} />
            대국 기록하기
          </span>
          <ChevronRight size={20} />
        </Button>
      </div>

      <div className={app.page}>
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}

        {/* 이번 달 통계 */}
        <section>
          <div className={s.statsMeta}>
            <div className={s.statsMetaTitle}>
              {loading ? <Skeleton width={120} height={16} /> : me ? (
                <>
                  {me.name}님의 {formatMonthKey(month)} <span>· {summary?.games ?? 0}국</span>
                </>
              ) : (
                '이번 달'
              )}
            </div>
            {!loading && members.length > 0 && (
              <button type="button" className={app.iconBtn} style={{ color: 'var(--text-muted)', width: 'auto', height: 32, padding: '0 6px', fontSize: 12.5, fontWeight: 600, gap: 2 }} onClick={() => setPickOpen(true)}>
                <UserRound size={14} /> 나 선택
              </button>
            )}
          </div>
          {loading ? (
            <div className={s.stats}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={118} radius={16} />
              ))}
            </div>
          ) : (
            <div className={s.stats}>
              <StatCard
                icon={<TrendingUp size={18} color="#075844" />}
                tone="#e4efe9"
                label="평균 순위"
                value={summary && summary.avgRank.current !== null ? formatAvgRank(summary.avgRank.current) : '-'}
                delta={<Delta delta={summary?.avgRank.delta ?? null} lowerIsBetter digits={1} />}
              />
              <StatCard
                icon={<Crown size={18} color="#b9861f" />}
                tone="#fbf0d0"
                label="1위 횟수"
                value={
                  <>
                    {summary?.firstCount.current ?? 0}
                    <small>회</small>
                  </>
                }
                delta={<Delta delta={summary?.firstCount.delta ?? null} digits={0} />}
              />
              <StatCard
                icon={<span style={{ fontFamily: 'serif', fontWeight: 800, color: '#C83D32', fontSize: 16, lineHeight: 1 }}>中</span>}
                tone="#fbeae8"
                label="라스 횟수"
                value={
                  <>
                    {summary?.lastCount.current ?? 0}
                    <small>회</small>
                  </>
                }
                delta={<Delta delta={summary?.lastCount.delta ?? null} lowerIsBetter digits={0} />}
              />
              <StatCard
                icon={<Coins size={18} color="#075844" />}
                tone="#e4efe9"
                label="누적 우마"
                value={
                  <span className={summary && summary.totalPoints.current ? (summary.totalPoints.current > 0 ? 'pos' : 'neg') : ''}>
                    {formatPoints(summary?.totalPoints.current ?? 0)}
                  </span>
                }
                delta={<Delta delta={summary?.totalPoints.delta ?? null} digits={1} />}
              />
            </div>
          )}
        </section>

        {/* 이번 달 랭킹 */}
        <Card>
          <SectionHeader icon={<Trophy size={18} />} title="이번 달 랭킹" right={formatMonthKey(month)} to="/ranking" />
          {loading ? (
            <Skeleton height={140} />
          ) : ranking.length === 0 ? (
            <EmptyState icon={<Trophy size={24} />} title="아직 이번 달 대국이 없어요" description="첫 대국을 기록하면 랭킹이 만들어져요." />
          ) : (
            ranking.map((row) => (
              <div key={row.member.id} className={s.rankRow}>
                <RankBadge rank={row.position} pill />
                <Avatar member={row.member} size={34} />
                <div className={s.rankName}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.member.name}</span>
                  {row.position === 1 && <span className={s.mvp}>MVP</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Points value={row.totalPoints} className={s.rankPoints} />
                  <div className={s.rankGames}>{row.games}국 · 평균 {formatAvgRank(row.avgRank)}위</div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* 최근 대국 */}
        <Card>
          <SectionHeader icon={<Clock size={18} />} title="최근 대국" right="전체 보기" to="/games" />
          {loading ? (
            <Skeleton height={120} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<PenLine size={24} />}
              title="기록된 대국이 없어요"
              description="위의 ‘대국 기록하기’ 버튼으로 첫 기록을 남겨보세요."
            />
          ) : (
            recent.map((g) => {
              const results = computeResults(g.scores, g.rules, g.gameType);
              const ordered = [...results].sort((a, b) => a.rank - b.rank);
              return (
                <Link key={g.id} to={`/games/${g.id}`} className={s.recent}>
                  <div className={s.recentDate}>
                    <strong>{formatDateShort(g.playedAt)}</strong>
                    {formatWeekday(g.playedAt)}
                  </div>
                  <div className={s.recentBody}>
                    <div className={s.recentTitle}>{g.title || '대국'}</div>
                    {g.memo && <div className={s.recentMemo}>{g.memo}</div>}
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
            })
          )}
        </Card>

        {storageKind && (
          <div className={s.storageBadge}>
            {storageKind === 'remote' ? <Database size={12} /> : <HardDrive size={12} />}
            {storageKind === 'remote' ? '공유 저장소(Redis)에 연결됨' : '이 기기에만 저장 중 (localStorage)'}
          </div>
        )}
      </div>

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="내 이름 선택">
        홈 화면의 통계를 보여줄 멤버를 골라주세요. 이 기기에만 기억됩니다.
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
