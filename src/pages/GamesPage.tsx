import { FileText, MapPin, PenLine, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { Segmented } from '../components/Segmented';
import { SkeletonRows } from '../components/Skeleton';
import { GAME_TYPE_LABEL } from '../config/rules';
import { formatDateShort, formatTime, formatWeekday } from '../lib/format';
import { computeResults, formatPoints, formatScore } from '../lib/scoring';
import { currentMonthKey, gamesInMonth, monthKey, sortGamesDesc } from '../lib/stats';
import type { Game } from '../lib/types';
import { useData, useMemberMap } from '../state/DataProvider';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

export function GameCard({ game }: { game: Game }) {
  const memberMap = useMemberMap();
  const results = useMemo(() => computeResults(game.scores, game.rules, game.gameType), [game]);
  const ordered = [...results].sort((a, b) => a.rank - b.rank);
  return (
    <Card className={s.gameItem} tight>
      <Link to={`/games/${game.id}`}>
        <div className={s.gameHead}>
          <div className={s.gameTitle}>
            <MapPin size={14} className={s.gameTitleIcon} />
            {game.place || '장소 미정'}
            <span className={s.typeTag}>{GAME_TYPE_LABEL[game.gameType]}</span>
          </div>
          <div className={s.gameMeta}>
            {formatDateShort(game.playedAt)} {formatWeekday(game.playedAt)} {formatTime(game.playedAt)}
          </div>
        </div>
        {ordered.map((r) => {
          const member = memberMap.get(game.playerIds[r.index]);
          return (
            <div key={r.index} className={s.playerRow}>
              <RankBadge rank={r.rank} size="sm" />
              <span className={s.playerName}>{member?.name ?? '(삭제된 멤버)'}</span>
              <span className={s.playerScore}>{formatScore(r.score)}</span>
              <span className={s.playerUma}>우마 {formatPoints(r.uma)}</span>
              <Points value={r.points} className={s.playerPoints} />
            </div>
          );
        })}
        {game.yakumans.length > 0 && (
          <div className={s.yakumanLine}>
            <Sparkles size={14} />
            {game.yakumans.map((y, i) => (
              <span key={i} className={s.yakumanChip}>
                {memberMap.get(y.playerId)?.name ?? '?'} · {y.name}
              </span>
            ))}
          </div>
        )}
      </Link>
    </Card>
  );
}

export function GamesPage() {
  const navigate = useNavigate();
  const { status, error, retry, games } = useData();
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [month, setMonth] = useState(currentMonthKey());
  const maxMonth = currentMonthKey();

  // 이번 달 기록이 없고 다른 달 기록이 있으면 가장 최근 달로 이동
  useEffect(() => {
    if (status !== 'ready' || games.length === 0) return;
    if (gamesInMonth(games, month).length === 0) {
      setMonth(monthKey(sortGamesDesc(games)[0].playedAt));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const list = useMemo(() => sortGamesDesc(mode === 'month' ? gamesInMonth(games, month) : games), [games, mode, month]);

  return (
    <>
      <PageHeader title="대국 기록" />
      <div className={app.page}>
        <div className={s.filterBar}>
          <Segmented
            value={mode}
            onChange={setMode}
            ariaLabel="기간"
            options={[
              { value: 'month', label: '월별' },
              { value: 'all', label: '전체' },
            ]}
          />
          {mode === 'month' ? <MonthPicker value={month} onChange={setMonth} max={maxMonth} /> : <span className={s.filterHint}>총 {games.length}국</span>}
        </div>

        {status === 'loading' && <SkeletonRows rows={3} height={150} />}
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}
        {status === 'ready' && list.length === 0 && (
          <Card>
            <EmptyState
              icon={<FileText size={24} />}
              title={mode === 'month' ? '이 달에는 기록이 없어요' : '아직 기록이 없어요'}
              description="대국을 기록하면 여기에 최신순으로 쌓여요."
              action={
                <Button variant="outline" size="sm" icon={<PenLine size={16} />} onClick={() => navigate('/record')}>
                  대국 기록하기
                </Button>
              }
            />
          </Card>
        )}
        {status === 'ready' && list.length > 0 && (
          <div className={s.list}>
            {list.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
