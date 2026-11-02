import { LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeader } from '../components/Card';
import { LineChart, type ChartSeries } from '../components/LineChart';
import ui from '../components/ui.module.css';
import { formatDateShort, formatTime, formatWeekday } from '../lib/format';
import { computeResults, formatPoints, formatScore } from '../lib/scoring';
import { cumulativePoints, memberPointsHistory, timelineLabels, type RankingRow } from '../lib/stats';
import type { Game, Member } from '../lib/types';

const RANK_COLOR = ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)', 'var(--rank-gray)'];
const OPEN_HINT = '한 번 더 누르면 대국 상세';

function pointsClass(v: number): string {
  return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
}

/**
 * 랭킹 탭: 대국 순서대로 모두의 누적 우마.
 * 나(초록)와 비교 상대 한 명(주황)만 색을 칠하고 나머지는 회색으로 둡니다.
 * 나를 고르지 않았거나 이 기간에 내 대국이 없으면 1위가 초록 자리에 섭니다.
 */
export function RankingTrendCard({ games, rows, meId }: { games: Game[]; rows: RankingRow[]; meId: string | null }) {
  const navigate = useNavigate();
  const ids = useMemo(() => rows.map((r) => r.member.id), [rows]);
  const timeline = useMemo(() => cumulativePoints(games, ids), [games, ids]);
  const [picked, setPicked] = useState<string | null>(null);

  const primary = meId && ids.includes(meId) ? meId : ids[0];
  const compare = picked && picked !== primary && ids.includes(picked) ? picked : (ids.find((id) => id !== primary) ?? null);
  const nameOf = (id: string) => rows.find((r) => r.member.id === id)?.member.name ?? '';
  const colorOf = (id: string) => (id === primary ? 'var(--chart-me)' : id === compare ? 'var(--chart-compare)' : 'var(--chart-rest)');
  const last = (id: string) => {
    const v = timeline.series.get(id)!;
    return v[v.length - 1];
  };

  if (timeline.games.length === 0) return null;

  const series: ChartSeries[] = ids.map((id) => ({
    id,
    values: timeline.series.get(id)!,
    color: colorOf(id),
    emphasis: id === primary || id === compare,
    label: nameOf(id),
  }));

  const renderTip = (i: number) => {
    const game = timeline.games[i - 1];
    const results = computeResults(game.scores, game.rules, game.gameType)
      .map((r) => ({ ...r, id: game.playerIds[r.index] }))
      .sort((a, b) => a.rank - b.rank);
    const tracked = [primary, compare].filter((id): id is string => !!id);
    return (
      <>
        <div className={ui.chartTipHead}>
          {i}국 · {formatDateShort(game.playedAt)} {formatTime(game.playedAt)}
        </div>
        {results.map((r) => (
          <div key={r.index} className={[ui.chartTipRow, tracked.includes(r.id) ? ui.chartTipRowStrong : ''].join(' ')}>
            <span>
              {r.rank}위 {nameOf(r.id) || '(삭제된 멤버)'}
            </span>
            <span>{formatPoints(r.points)}</span>
          </div>
        ))}
        <div className={ui.chartTipSub}>
          누적 {tracked.map((id) => `${nameOf(id)} ${formatPoints(timeline.series.get(id)![i])}`).join(' · ')}
          <br />
          {OPEN_HINT}
        </div>
      </>
    );
  };

  return (
    <Card>
      <SectionHeader icon={<TrendingUp size={18} />} title="누적 우마 추이" right={`${timeline.games.length}국`} />
      <div className={ui.chartChips} role="group" aria-label="비교할 사람">
        {ids.map((id) => {
          const on = id === primary || id === compare;
          return (
            <button
              key={id}
              type="button"
              className={ui.chartChip}
              style={on ? { borderColor: colorOf(id), color: colorOf(id) } : undefined}
              aria-pressed={on}
              onClick={() => id !== primary && setPicked(id)}
            >
              <i className={ui.chartChipDot} style={{ background: colorOf(id) }} />
              {nameOf(id)}
              {id === meId && '(나)'}
              <small>{formatPoints(last(id))}</small>
            </button>
          );
        })}
      </div>
      <LineChart
        series={series}
        xLabels={timelineLabels(timeline.games)}
        renderTip={renderTip}
        onOpen={(i) => navigate(`/games/${timeline.games[i - 1].id}`)}
        ariaLabel={`누적 우마 추이: ${[primary, compare]
          .filter((id): id is string => !!id)
          .map((id) => `${nameOf(id)} ${formatPoints(last(id))}`)
          .join(', ')}`}
      />
      {ids.length > 2 && <div className={ui.chartHint}>이름을 누르면 비교할 사람이 바뀌어요</div>}
    </Card>
  );
}

/** 내 기록 탭: 내가 참여한 대국만 순서대로 놓고 누적 우마를 그립니다. 점 색은 그 판의 순위. */
export function MyPointsFlowCard({ games, me, periodLabel }: { games: Game[]; me: Member; periodLabel: string }) {
  const navigate = useNavigate();
  const history = useMemo(() => memberPointsHistory(games, me.id), [games, me.id]);
  if (history.length === 0) return null;

  const values = [0, ...history.map((h) => h.cumulative)];
  const best = history.reduce((a, b) => (b.cumulative > a.cumulative ? b : a));
  const worst = history.reduce((a, b) => (b.cumulative < a.cumulative ? b : a));
  const final = history[history.length - 1].cumulative;

  const renderTip = (i: number) => {
    const h = history[i - 1];
    return (
      <>
        <div className={ui.chartTipHead}>
          {formatDateShort(h.game.playedAt)} {formatWeekday(h.game.playedAt)} · {h.rank}위
        </div>
        <div className={ui.chartTipRow}>
          <span>최종 점수</span>
          <span>{formatScore(h.score)}</span>
        </div>
        <div className={[ui.chartTipRow, ui.chartTipRowStrong].join(' ')}>
          <span>이 판 우마</span>
          <span>{formatPoints(h.points)}</span>
        </div>
        <div className={ui.chartTipSub}>
          누적 {formatPoints(h.cumulative)}
          <br />
          {OPEN_HINT}
        </div>
      </>
    );
  };

  return (
    <Card>
      <SectionHeader icon={<LineChartIcon size={18} />} title="내 우마 흐름" right={periodLabel} />
      <div className={ui.chartChips} style={{ gap: 14, color: 'var(--text-muted)', fontSize: 13 }}>
        <span>
          최고 <b className={pointsClass(best.cumulative)}>{formatPoints(best.cumulative)}</b> ({formatDateShort(best.game.playedAt)})
        </span>
        <span>
          최저 <b className={pointsClass(worst.cumulative)}>{formatPoints(worst.cumulative)}</b> ({formatDateShort(worst.game.playedAt)})
        </span>
      </div>
      <LineChart
        series={[{ id: me.id, values, color: 'var(--chart-me)', emphasis: true, label: '누적' }]}
        xLabels={timelineLabels(history.map((h) => h.game))}
        dots={history.map((h, k) => ({ index: k + 1, value: h.cumulative, color: RANK_COLOR[h.rank - 1] ?? RANK_COLOR[3] }))}
        renderTip={renderTip}
        onOpen={(i) => navigate(`/games/${history[i - 1].game.id}`)}
        ariaLabel={`${me.name}의 우마 흐름: ${history.length}국, 누적 ${formatPoints(final)}, 최고 ${formatPoints(best.cumulative)}, 최저 ${formatPoints(worst.cumulative)}`}
      />
      <div className={ui.chartLegend} aria-hidden="true">
        {RANK_COLOR.map((c, k) => (
          <span key={k}>
            <i style={{ background: c }} />
            {k + 1}위
          </span>
        ))}
      </div>
    </Card>
  );
}
