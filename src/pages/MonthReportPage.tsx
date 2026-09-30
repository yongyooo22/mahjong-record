import { CalendarX, Clock, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PageHeader } from '../components/PageHeader';
import { Skeleton } from '../components/Skeleton';
import { StatGrid } from '../components/StatCard';
import { computeGroupSummary, computeRanking, currentMonthKey, formatMonthKey, gamesInMonth, isMonthKey, sortGamesDesc, yakumansOf } from '../lib/stats';
import { useData } from '../state/DataProvider';
import app from '../styles/App.module.css';
import { YakumanRows } from './HallOfFame';
import { GameRows, MonthRankingRows, MonthStatGrid } from './MonthSections';
import s from './Pages.module.css';

/** 월별 현황 (/ranking/:month) — 명예의 전당에서 달 카드를 누르면 열리는, 홈과 같은 구성의 그 달 요약 */
export function MonthReportPage() {
  const { month = '' } = useParams();
  const { status, error, retry, syncing, games, members } = useData();
  const valid = isMonthKey(month);

  const monthGames = useMemo(() => (valid ? sortGamesDesc(gamesInMonth(games, month)) : []), [games, month, valid]);
  const summary = useMemo(() => computeGroupSummary(games, month), [games, month]);
  const ranking = useMemo(() => computeRanking(monthGames, members), [monthGames, members]);
  const yakumans = useMemo(() => yakumansOf(monthGames), [monthGames]);

  const current = month === currentMonthKey();
  // 이 기기에 저장해 둔 데이터를 보여 주는 중이면 서버 데이터가 올 때까지 "대국 없음" 대신 로딩 표시
  const loading = status === 'loading' || (syncing && monthGames.length === 0);

  return (
    <>
      <PageHeader title={valid ? `${formatMonthKey(month)} 현황` : '월별 현황'} back />
      <div className={app.page}>
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}

        {!valid && (
          <Card>
            <EmptyState icon={<CalendarX size={24} />} title="잘못된 주소예요" description="명예의 전당에서 달을 다시 골라 주세요." />
          </Card>
        )}

        {valid && loading && (
          <>
            <StatGrid>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={118} radius={16} />
              ))}
            </StatGrid>
            <Skeleton height={140} />
          </>
        )}

        {valid && !loading && status === 'ready' && monthGames.length === 0 && (
          <Card>
            <EmptyState icon={<CalendarX size={24} />} title="이 달에는 대국이 없어요" description="대국을 기록하면 달마다 현황이 만들어져요." />
          </Card>
        )}

        {valid && !loading && status === 'ready' && monthGames.length > 0 && (
          <>
            <section>
              <div className={s.monthMeta}>
                {formatMonthKey(month)} 모임 현황 <span>· {monthGames.length}국</span>
              </div>
              <MonthStatGrid summary={summary} gamesLabel={current ? '이번 달 대국' : '대국 수'} />
            </section>

            <Card>
              <SectionHeader icon={<Trophy size={18} />} title={current ? '이번 달 랭킹' : '월간 랭킹'} right={current ? '진행 중' : undefined} />
              <MonthRankingRows ranking={ranking} />
            </Card>

            {yakumans.length > 0 && (
              <Card>
                <SectionHeader icon={<Sparkles size={18} />} title="역만" right={`${yakumans.length}건`} />
                <YakumanRows yakumans={yakumans} />
              </Card>
            )}

            <Card>
              <SectionHeader icon={<Clock size={18} />} title="대국 기록" right={`${monthGames.length}국`} />
              <GameRows games={monthGames} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
