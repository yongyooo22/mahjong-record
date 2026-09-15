import { Bell, ChevronRight, Clock, Crown, Database, Dices, HardDrive, PenLine, Trophy, UserRound, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card, SectionHeader } from '../components/Card';
import { Delta } from '../components/Delta';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Mascot } from '../components/Mascot';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { Skeleton } from '../components/Skeleton';
import { StatCard, StatGrid } from '../components/StatCard';
import { formatAvgRank, formatDateShort, formatWeekday } from '../lib/format';
import { computeResults } from '../lib/scoring';
import { computeGroupSummary, computeRanking, currentMonthKey, formatMonthKey, gamesInMonth, sortGamesDesc } from '../lib/stats';
import { useData, useMemberMap } from '../state/DataProvider';
import app from '../styles/App.module.css';
import ui from '../components/ui.module.css';
import s from './Home.module.css';

const APP_SUBTITLE = '대국 기록 · 랭킹 · 통계';

function HomeHeader() {
  return (
    <header className={app.header}>
      <div className={app.headerInner}>
        <div className={s.top}>
          <div className={s.logo} aria-hidden="true">
            發
          </div>
          <div className={s.titleBox}>
            <h1 className={s.appName}>마작 고수들의 모임</h1>
            <p className={s.subtitle}>{APP_SUBTITLE}</p>
          </div>
          <button type="button" className={s.bell} aria-label="알림 (준비 중)">
            <Bell size={22} />
          </button>
        </div>
        <div className={s.hero}>
          <Mascot name="home" className={s.heroImg} fallbackClassName={s.heroEmpty} />
        </div>
      </div>
    </header>
  );
}

/** 이름을 값으로 쓰는 통계 카드 값 (1위 최다 / 라스 최다) */
function NameStat({ name }: { name: string | null }) {
  return <span className={ui.statValueText}>{name ?? '-'}</span>;
}

/**
 * 홈: 누가 접속하든 같은 화면 — 모임 전체의 이번 달 현황, 랭킹, 최근 대국.
 * 개인 통계는 "내 기록" 탭에서 봅니다.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { status, error, retry, games, members, storageKind } = useData();
  const memberMap = useMemberMap();
  const month = currentMonthKey();

  const summary = useMemo(() => computeGroupSummary(games, month), [games, month]);
  const ranking = useMemo(() => computeRanking(gamesInMonth(games, month), members), [games, members, month]);
  const recent = useMemo(() => sortGamesDesc(games).slice(0, 5), [games]);

  const loading = status === 'loading';
  const nameOf = (id: string | undefined) => (id ? (memberMap.get(id)?.name ?? '?') : null);

  return (
    <>
      <HomeHeader />
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

        {/* 이번 달 모임 현황 (공용) */}
        <section>
          <div className={s.statsMeta}>
            <div className={s.statsMetaTitle}>
              {loading ? (
                <Skeleton width={120} height={16} />
              ) : (
                <>
                  {formatMonthKey(month)} 모임 현황 <span>· {summary.games.current ?? 0}국</span>
                </>
              )}
            </div>
            {!loading && (
              <Link to="/me" className={s.statsMetaLink}>
                <UserRound size={14} /> 내 기록 보기
              </Link>
            )}
          </div>
          {loading ? (
            <StatGrid>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={118} radius={16} />
              ))}
            </StatGrid>
          ) : (
            <StatGrid>
              <StatCard
                icon={<Dices size={18} color="#075844" />}
                tone="#e4efe9"
                label="이번 달 대국"
                value={
                  <>
                    {summary.games.current ?? 0}
                    <small>국</small>
                  </>
                }
                sub={<Delta delta={summary.games.delta} digits={0} />}
              />
              <StatCard
                icon={<Users size={18} color="#075844" />}
                tone="#e4efe9"
                label="참여 멤버"
                value={
                  <>
                    {summary.players.current ?? 0}
                    <small>명</small>
                  </>
                }
                sub={<Delta delta={summary.players.delta} digits={0} />}
              />
              <StatCard
                icon={<Crown size={18} color="#b9861f" />}
                tone="#fbf0d0"
                label="1위 최다"
                value={<NameStat name={nameOf(summary.topFirst?.memberId)} />}
                sub={summary.topFirst ? `${summary.topFirst.count}회 1위` : '아직 없음'}
              />
              <StatCard
                icon={<span style={{ fontFamily: 'serif', fontWeight: 800, color: '#C83D32', fontSize: 16, lineHeight: 1 }}>中</span>}
                tone="#fbeae8"
                label="라스 최다"
                value={<NameStat name={nameOf(summary.topLast?.memberId)} />}
                sub={summary.topLast ? `${summary.topLast.count}회 라스` : '아직 없음'}
              />
            </StatGrid>
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
    </>
  );
}
