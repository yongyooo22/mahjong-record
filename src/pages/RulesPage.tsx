import { Calculator, History, Medal, Smile } from 'lucide-react';
import { Card, SectionHeader } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { HOUSE_RULES, RULE_CHANGES } from '../config/rulebook';
import { DEFAULT_RULES, GAME_TYPE_LABEL, type GameType } from '../config/rules';
import { formatPoints, formatScore, umaForRank } from '../lib/scoring';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

const PLAYER_COUNT = 4;
const GAME_TYPES: GameType[] = ['hanchan', 'tonpuu'];

function formatChangeDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return d ? `${y}년 ${m}월 ${d}일` : `${y}년 ${m}월`;
}

/** 규칙 탭: 정산 점수는 지금 앱이 계산에 쓰는 규칙(DEFAULT_RULES)에서 그대로 만들어 룰북과 계산이 어긋나지 않게 합니다. */
export function RulesPage() {
  const rules = DEFAULT_RULES;
  const oka = ((rules.returnPoints - rules.startPoints) * PLAYER_COUNT) / 1000;

  return (
    <>
      <PageHeader title="우리 규칙" />
      <div className={app.page}>
        {/* 모임 규칙(매너 등)을 맨 위에 */}
        {HOUSE_RULES.map((section) => (
          <Card key={section.title}>
            <SectionHeader icon={<Smile size={18} />} title={section.title} />
            <ul className={s.ruleList}>
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}

        <Card>
          <SectionHeader icon={<Calculator size={18} />} title="정산 점수" />
          {/* 좁은 화면에서는 덩어리 사이에서만 줄을 바꿉니다. */}
          <div className={s.ruleFormula}>
            <span>정산 점수 =</span> <span>(최종 점수 − {formatScore(rules.returnPoints)}) ÷ 1,000</span> <span>+ 순위 우마</span>
          </div>
          <div className={s.kv}>
            <span>기본 점수</span>
            <strong>
              {formatScore(rules.startPoints)}점 (4명 합계 {formatScore(rules.startPoints * PLAYER_COUNT)}점)
            </strong>
          </div>
          <div className={s.kv}>
            <span>나눗셈</span>
            <strong>반올림 없음 (소수 첫째 자리까지)</strong>
          </div>
          <div className={s.kv}>
            <span>오카</span>
            <strong>{oka > 0 ? `1위에게 +${oka}` : '없음'}</strong>
          </div>
        </Card>

        <Card>
          <SectionHeader icon={<Medal size={18} />} title="순위 우마" />
          <div className={s.umaTable} role="table" aria-label="순위 우마">
            <div className={s.umaRow} role="row">
              <span role="columnheader" />
              {[1, 2, 3, 4].map((rank) => (
                <span key={rank} role="columnheader" className={s.umaHead}>
                  {rank}위
                </span>
              ))}
            </div>
            {GAME_TYPES.map((type) => (
              <div key={type} className={s.umaRow} role="row">
                <span role="rowheader" className={s.umaType}>
                  {GAME_TYPE_LABEL[type]}
                </span>
                {[1, 2, 3, 4].map((rank) => {
                  const uma = umaForRank(rank, rules, type);
                  return (
                    <span key={rank} role="cell" className={[s.umaCell, uma > 0 ? 'pos' : uma < 0 ? 'neg' : ''].join(' ')}>
                      {formatPoints(uma).replace(/\.0$/, '')}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={s.ruleNote}>동풍전 우마는 반장전의 {rules.tonpuuUmaMultiplier === 0.5 ? '절반' : `${rules.tonpuuUmaMultiplier}배`}이에요.</div>
          <div className={s.kv}>
            <span>동점</span>
            <strong>누구를 상위 순위로 할지 기록할 때 고를 수 있음 (우마 나누지 않음)</strong>
          </div>
          <div className={s.kv}>
            <span>누적 우마</span>
            <strong>정산 점수의 합계 (랭킹 기준)</strong>
          </div>
        </Card>

        {RULE_CHANGES.length > 0 && (
          <Card>
            <SectionHeader icon={<History size={18} />} title="바뀐 기록" />
            <ul className={s.ruleChanges}>
              {RULE_CHANGES.map((change) => (
                <li key={change.date + change.text}>
                  <strong>{formatChangeDate(change.date)}</strong>
                  <span>{change.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
