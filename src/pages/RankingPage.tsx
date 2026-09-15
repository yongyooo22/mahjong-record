import { Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { Segmented } from '../components/Segmented';
import { SkeletonRows } from '../components/Skeleton';
import { formatAvgRank } from '../lib/format';
import { computeRanking, currentMonthKey, gamesInMonth } from '../lib/stats';
import { useData } from '../state/DataProvider';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

export function RankingPage() {
  const { status, error, retry, games, members } = useData();
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [month, setMonth] = useState(currentMonthKey());
  const maxMonth = currentMonthKey();

  const rows = useMemo(
    () => computeRanking(mode === 'month' ? gamesInMonth(games, month) : games, members),
    [games, members, mode, month],
  );
  const gameCount = mode === 'month' ? gamesInMonth(games, month).length : games.length;

  return (
    <>
      <PageHeader title="랭킹" />
      <div className={app.page}>
        <div className={s.filterBar}>
          <Segmented
            value={mode}
            onChange={setMode}
            ariaLabel="기간"
            options={[
              { value: 'month', label: '월별' },
              { value: 'all', label: '전체 기간' },
            ]}
          />
          {mode === 'month' ? <MonthPicker value={month} onChange={setMonth} max={maxMonth} /> : <span className={s.filterHint}>총 {gameCount}국</span>}
        </div>
        <div className={s.filterHint} style={{ paddingLeft: 4 }}>
          누적 우마 기준 · {mode === 'month' ? `${gameCount}국` : '모든 대국'}
        </div>

        {status === 'loading' && <SkeletonRows rows={4} height={72} />}
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}
        {status === 'ready' && rows.length === 0 && (
          <Card>
            <EmptyState
              icon={<Trophy size={24} />}
              title={mode === 'month' ? '이 달의 랭킹이 아직 없어요' : '아직 랭킹이 없어요'}
              description="대국을 기록하면 누적 우마 순으로 랭킹이 만들어져요."
            />
          </Card>
        )}
        {status === 'ready' && rows.length > 0 && (
          <div className={s.list}>
            {rows.map((row) => (
              <Card key={row.member.id} className={s.rankingRow} tight>
                {row.position <= 3 ? <RankBadge rank={row.position} /> : <span className={s.rankingPos}>{row.position}위</span>}
                <Avatar member={row.member} size={40} />
                <div className={s.rankingBody}>
                  <div className={s.rankingName}>{row.member.name}</div>
                  <div className={s.rankingSub}>
                    <span>
                      평균 <b>{formatAvgRank(row.avgRank)}위</b>
                    </span>
                    <span>
                      <b>{row.games}</b>국
                    </span>
                    <span>
                      1위율 <b>{row.firstRate}%</b>
                    </span>
                  </div>
                </div>
                <div>
                  <Points value={row.totalPoints} className={s.rankingPoints} style={{ display: 'block' }} />
                  <span className={s.rankingPointsLabel}>누적 우마</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
