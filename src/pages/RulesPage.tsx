import { AlertTriangle, Ban, BookOpen, Calculator, Coins, History, Medal, Smile, Star, type LucideIcon } from 'lucide-react';
import { Card, SectionHeader } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { RULE_CHANGES, RULES_AFTER_SCORING, RULES_BEFORE_SCORING, SCORING_NOTES, type RuleIcon, type RuleSection } from '../config/rulebook';
import { DEFAULT_RULES, GAME_TYPE_LABEL, type GameType } from '../config/rules';
import { formatPoints, formatScore, umaForRank } from '../lib/scoring';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

const PLAYER_COUNT = 4;
const GAME_TYPES: GameType[] = ['hanchan', 'tonpuu'];
const ICONS: Record<RuleIcon, LucideIcon> = { smile: Smile, book: BookOpen, star: Star, alert: AlertTriangle, ban: Ban, coins: Coins };
const SCORING_ID = 'scoring';
const CHANGES_ID = 'changes';

function formatChangeDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return d ? `${y}년 ${m}월 ${d}일` : `${y}년 ${m}월`;
}

function scrollToSection(id: string) {
  document.getElementById(`rule-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function RuleCard({ section }: { section: RuleSection }) {
  const Icon = ICONS[section.icon];
  return (
    <Card id={`rule-${section.id}`} className={s.ruleCard}>
      <SectionHeader icon={<Icon size={18} />} title={section.title} />
      {section.note && <p className={s.ruleSectionNote}>{section.note}</p>}
      <ul className={s.ruleList}>
        {section.items.map((item, i) => (
          <li key={i}>
            {typeof item === 'string' ? (
              item
            ) : (
              <>
                <strong className={s.ruleLabel}>{item.label}</strong> {item.text}
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * 규칙 탭: 모임 룰북.
 * 시작·반환 점수, 계산식, 우마, 오카는 지금 앱이 계산에 쓰는 규칙(DEFAULT_RULES)에서 그대로 만들어 룰북과 계산이 어긋나지 않게 합니다.
 */
export function RulesPage() {
  const rules = DEFAULT_RULES;
  const oka = ((rules.returnPoints - rules.startPoints) * PLAYER_COUNT) / 1000;
  const shortcuts = [
    ...RULES_BEFORE_SCORING.map((x) => ({ id: x.id, label: x.short })),
    { id: SCORING_ID, label: '점수 계산' },
    ...RULES_AFTER_SCORING.map((x) => ({ id: x.id, label: x.short })),
    ...(RULE_CHANGES.length > 0 ? [{ id: CHANGES_ID, label: '바뀐 기록' }] : []),
  ];

  return (
    <>
      <PageHeader title="우리 규칙" />
      <div className={app.page}>
        <nav className={s.ruleShortcuts} aria-label="규칙 바로가기">
          {shortcuts.map((x) => (
            <button key={x.id} type="button" className={s.ruleShortcut} onClick={() => scrollToSection(x.id)}>
              {x.label}
            </button>
          ))}
        </nav>

        {RULES_BEFORE_SCORING.map((section) => (
          <RuleCard key={section.id} section={section} />
        ))}

        <Card id={`rule-${SCORING_ID}`} className={s.ruleCard}>
          <SectionHeader icon={<Calculator size={18} />} title="최종 점수 계산" />
          {/* 좁은 화면에서는 덩어리 사이에서만 줄을 바꿉니다. */}
          <div className={s.ruleFormula}>
            <span>정산 점수 =</span> <span>(최종 점수 − {formatScore(rules.returnPoints)}) ÷ 1,000</span> <span>+ 순위 우마</span>
          </div>
          <div className={s.kv}>
            <span>시작 점수</span>
            <strong>{formatScore(rules.startPoints)}점</strong>
          </div>
          <div className={s.kv}>
            <span>반환점</span>
            <strong>{formatScore(rules.returnPoints)}점</strong>
          </div>
          <div className={s.kv}>
            <span>100점 단위</span>
            <strong>소수점 처리 (반올림 없음)</strong>
          </div>
          <div className={s.kv}>
            <span>오카</span>
            <strong>{oka > 0 ? `1위에게 +${oka}` : '없음'}</strong>
          </div>
          {SCORING_NOTES.length > 0 && (
            <ul className={[s.ruleList, s.ruleListAfterKv].join(' ')}>
              {SCORING_NOTES.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card className={s.ruleCard}>
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
            <strong>기가에서 가까운 순서로 순위 결정 (기록할 때 순서를 맞춰요)</strong>
          </div>
          <div className={s.kv}>
            <span>누적 우마</span>
            <strong>정산 점수의 합계 (랭킹 기준)</strong>
          </div>
        </Card>

        {RULES_AFTER_SCORING.map((section) => (
          <RuleCard key={section.id} section={section} />
        ))}

        {RULE_CHANGES.length > 0 && (
          <Card id={`rule-${CHANGES_ID}`} className={s.ruleCard}>
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
