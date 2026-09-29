import { ChevronRight, Crown, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Points } from '../components/Points';
import { formatDateShort } from '../lib/format';
import { computeHallOfFame, currentMonthKey, formatMonthKey } from '../lib/stats';
import type { Game, Member } from '../lib/types';
import { useMemberMap } from '../state/DataProvider';
import s from './Pages.module.css';

/** 명예의 전당: 달마다 1위와 역만을 낸 사람 (최신 달부터) */
export function HallOfFame({ games, members }: { games: Game[]; members: Member[] }) {
  const memberMap = useMemberMap();
  const months = useMemo(() => computeHallOfFame(games, members), [games, members]);
  const thisMonth = currentMonthKey();

  return (
    <div className={s.list}>
      {months.map((m) => {
        const ongoing = m.month === thisMonth;
        return (
          <Card key={m.month} className={s.fameCard}>
            <div className={s.fameHead}>
              <span className={s.fameMonth}>{formatMonthKey(m.month)}</span>
              {ongoing && <span className={s.fameOngoing}>진행 중</span>}
              <span className={s.fameGames}>{m.games}국</span>
            </div>

            {m.champion && (
              <div className={s.fameChampion}>
                <span className={s.fameCrown} aria-hidden="true">
                  <Crown size={18} />
                </span>
                <Avatar member={m.champion.member} size={40} />
                <div className={s.rankingBody}>
                  <div className={s.fameLabel}>{ongoing ? '현재 1위' : '이달의 1위'}</div>
                  <div className={s.rankingName}>{m.champion.member.name}</div>
                </div>
                <div className={s.rankingRight}>
                  <Points value={m.champion.totalPoints} className={s.rankingPoints} style={{ display: 'block' }} />
                  <span className={s.rankingPointsLabel}>누적 우마</span>
                </div>
              </div>
            )}

            {m.yakumans.length > 0 && (
              <div className={s.fameYakumans}>
                {m.yakumans.map((y, i) => (
                  <Link key={`${y.gameId}-${i}`} to={`/games/${y.gameId}`} className={s.fameYakuman}>
                    <Sparkles size={14} className={s.fameYakumanIcon} />
                    <span className={s.fameYakumanName}>{memberMap.get(y.memberId)?.name ?? '?'}</span>
                    <span className={s.yakumanChip}>{y.name}</span>
                    <span className={s.fameYakumanDate}>{formatDateShort(y.playedAt)}</span>
                    <ChevronRight size={15} className={s.fameYakumanArrow} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
