import { ChevronRight, Clock, PenLine, Trophy, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Mascot } from '../components/Mascot';
import { Skeleton } from '../components/Skeleton';
import { headerBgStyle, LOGO_IMAGE } from '../config/images';
import { computeGroupSummary, computeRanking, currentMonthKey, formatMonthKey, gamesInMonth, sortGamesDesc } from '../lib/stats';
import { useData } from '../state/DataProvider';
import app from '../styles/App.module.css';
import { GameRows, MonthRankingRows, MonthStatGrid } from './MonthSections';
import { HomeSponsorCard } from './SponsorSections';
import s from './Home.module.css';

const APP_SUBTITLE = '대국 기록 · 랭킹 · 통계';

/** 왼쪽 위 로고: public/images/logo.png 가 있으면 그 그림, 없으면 發 패 */
function Logo() {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className={s.logo} aria-hidden="true">
        發
      </div>
    );
  }
  return <img src={LOGO_IMAGE} alt="" className={s.logoImg} decoding="async" onError={() => setMissing(true)} />;
}

function HomeHeader() {
  return (
    <header className={[app.header, app.headerImage].join(' ')} style={headerBgStyle('home')}>
      <div className={app.headerInner}>
        <div className={s.top}>
          <Logo />
          <div className={s.titleBox}>
            <h1 className={s.appName}>마작 고수들의 모임</h1>
            <p className={s.subtitle}>{APP_SUBTITLE}</p>
          </div>
        </div>
        <div className={s.hero}>
          <Mascot name="home" className={s.heroImg} fallbackClassName={s.heroEmpty} />
        </div>
      </div>
    </header>
  );
}

/**
 * 홈: 누가 접속하든 같은 화면 — 모임 전체의 이번 달 현황 → 랭킹 → 후원 → 최근 대국.
 * 개인 통계는 "내 기록" 탭에서 봅니다.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { status, error, retry, games, members, sponsors } = useData();
  const month = currentMonthKey();

  const summary = useMemo(() => computeGroupSummary(games, month), [games, month]);
  const ranking = useMemo(() => computeRanking(gamesInMonth(games, month), members), [games, members, month]);
  const recent = useMemo(() => sortGamesDesc(games).slice(0, 5), [games]);

  const loading = status === 'loading';

  return (
    <>
      <HomeHeader />
      <div className={s.ctaWrap}>
        <Button variant="primary" full className={s.cta} onClick={() => navigate('/record')} disabled={status !== 'ready'}>
          <span className={s.ctaLabel}>
            <span className={s.ctaIcon}>
              <PenLine size={18} />
            </span>
            대국 기록하기
          </span>
          <span className={s.ctaArrow}>
            <ChevronRight size={18} />
          </span>
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
            <Skeleton height={136} radius={16} />
          ) : (
            // 홈은 카드 한 장짜리 작은 형태 — 누르면 이번 달 월별 현황
            <MonthStatGrid summary={summary} gamesLabel="이번 달 대국" variant="compact" to={`/ranking/${month}`} />
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
            <MonthRankingRows ranking={ranking} />
          )}
        </Card>

        {/* 후원 현황 — 랭킹보다 눈에 띄지 않게, 랭킹 아래 */}
        {loading ? <Skeleton height={92} radius={16} /> : <HomeSponsorCard sponsors={sponsors} />}

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
            <GameRows games={recent} />
          )}
        </Card>

      </div>
    </>
  );
}
