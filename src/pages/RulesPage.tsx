import type { ReactNode } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  RULE_CHANGES,
  RULEBOOK_MOTTO,
  RULEBOOK_TITLE,
  RULES_AFTER_SCORING,
  RULES_BEFORE_SCORING,
  SCORING_NOTES,
  type RuleRow,
  type RuleSection,
} from '../config/rulebook';
import { DEFAULT_RULES, GAME_TYPE_LABEL, type GameType } from '../config/rules';
import { formatPoints, formatScore, umaForRank } from '../lib/scoring';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

const PLAYER_COUNT = 4;
const RANKS = [1, 2, 3, 4];
const GAME_TYPES: GameType[] = ['hanchan', 'tonpuu'];
const SCORING_ID = 'scoring';
const UMA_ID = 'uma';
const CHANGES_ID = 'changes';

function formatChangeDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return d ? `${y}년 ${m}월 ${d}일` : `${y}년 ${m}월`;
}

function scrollToArticle(id: string) {
  document.getElementById(`rule-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** ◎·※ 표시가 줄 끝에 혼자 남지 않게 뒤 낱말과 붙입니다 (U+2060 은 줄바꿈을 막는 보이지 않는 글자). */
function keepMarks(text: string): string {
  return text.replace(/([◎※])(?=\S)/g, '$1\u2060');
}

function RuleTable({ rows }: { rows: RuleRow[] }) {
  return (
    <dl className={s.rbTable}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{keepMarks(row.text)}</dd>
        </div>
      ))}
    </dl>
  );
}

function RuleItems({ items }: { items: string[] }) {
  return (
    <ol className={s.rbList}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

/** 조 하나: '제N조 제목' 과 본문 */
function Article({ id, no, title, children }: { id: string; no: string; title: string; children: ReactNode }) {
  return (
    <section id={`rule-${id}`} className={s.rbArticle}>
      <h3>
        <span className={s.rbNo}>{no}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function SectionBody({ section }: { section: RuleSection }) {
  return (
    <>
      {section.lead && <p className={s.rbLead}>{section.lead}</p>}
      {section.rows && <RuleTable rows={section.rows} />}
      {section.items && <RuleItems items={section.items} />}
      {section.groups?.map((group) => (
        <div key={group.title} className={s.rbGroup}>
          <h4>{group.title}</h4>
          <RuleItems items={group.items} />
        </div>
      ))}
    </>
  );
}

/**
 * 규칙 탭: 모임 룰북 (규정집 한 장).
 * 시작·반환 점수, 계산식, 우마, 오카는 지금 앱이 계산에 쓰는 규칙(DEFAULT_RULES)에서 그대로 만들어 룰북과 계산이 어긋나지 않게 합니다.
 */
export function RulesPage() {
  const rules = DEFAULT_RULES;
  const oka = ((rules.returnPoints - rules.startPoints) * PLAYER_COUNT) / 1000;
  const tonpuuUma = rules.tonpuuUmaMultiplier === 0.5 ? '절반' : `${rules.tonpuuUmaMultiplier}배`;

  const scoringRows: RuleRow[] = [
    { label: '시작 점수', text: `${formatScore(rules.startPoints)}점` },
    { label: '반환점', text: `${formatScore(rules.returnPoints)}점` },
    { label: '100점 단위', text: '소수점으로 처리 (반올림하지 않음)' },
    { label: '오카', text: oka > 0 ? `1위에게 +${oka}` : '없음' },
  ];
  const umaNotes = [
    `동풍전 우마는 반장전의 ${tonpuuUma}으로 한다.`,
    '동점일 때는 기가에서 가까운 순서로 순위를 정한다. 기록할 때도 이 순서대로 입력한다.',
    '누적 우마는 정산 점수의 합계이며, 랭킹의 기준으로 삼는다.',
  ];

  // 조 번호는 화면에 나오는 순서대로 붙입니다.
  const articles: { id: string; title: string; body: ReactNode }[] = [
    ...RULES_BEFORE_SCORING.map((x) => ({ id: x.id, title: x.title, body: <SectionBody section={x} /> })),
    {
      id: SCORING_ID,
      title: '최종 점수 계산',
      body: (
        <>
          {/* 좁은 화면에서는 덩어리 사이에서만 줄을 바꿉니다. */}
          <div className={s.rbFormula}>
            <span>정산 점수 =</span> <span>(최종 점수 − {formatScore(rules.returnPoints)}) ÷ 1,000</span> <span>+ 순위 우마</span>
          </div>
          <RuleTable rows={scoringRows} />
          {SCORING_NOTES.length > 0 && <RuleItems items={SCORING_NOTES} />}
        </>
      ),
    },
    {
      id: UMA_ID,
      title: '순위 우마',
      body: (
        <>
          <table className={s.rbUma}>
            <thead>
              <tr>
                <th scope="col">구분</th>
                {RANKS.map((rank) => (
                  <th key={rank} scope="col">
                    {rank}위
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GAME_TYPES.map((type) => (
                <tr key={type}>
                  <th scope="row">{GAME_TYPE_LABEL[type]}</th>
                  {RANKS.map((rank) => {
                    const uma = umaForRank(rank, rules, type);
                    return (
                      <td key={rank} className={uma > 0 ? 'pos' : uma < 0 ? 'neg' : undefined}>
                        {formatPoints(uma).replace(/\.0$/, '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <RuleItems items={umaNotes} />
        </>
      ),
    },
    ...RULES_AFTER_SCORING.map((x) => ({ id: x.id, title: x.title, body: <SectionBody section={x} /> })),
  ];
  const hasChanges = RULE_CHANGES.length > 0;

  return (
    <>
      <PageHeader title="규칙" />
      <div className={app.page}>
        <article className={s.rulebook}>
          <header className={s.rbHead}>
            <h2>{RULEBOOK_TITLE}</h2>
            <p className={s.rbMotto}>{RULEBOOK_MOTTO}</p>
            {hasChanges && <p className={s.rbRevised}>최종 개정 {formatChangeDate(RULE_CHANGES[0].date)}</p>}
          </header>

          <nav className={s.rbToc} aria-label="목차">
            <ol>
              {articles.map((x, i) => (
                <li key={x.id}>
                  <button type="button" onClick={() => scrollToArticle(x.id)}>
                    <span className={s.rbNo}>제{i + 1}조</span>
                    {x.title}
                  </button>
                </li>
              ))}
              {hasChanges && (
                <li>
                  <button type="button" onClick={() => scrollToArticle(CHANGES_ID)}>
                    <span className={s.rbNo}>부칙</span>
                    개정 이력
                  </button>
                </li>
              )}
            </ol>
          </nav>

          {articles.map((x, i) => (
            <Article key={x.id} id={x.id} no={`제${i + 1}조`} title={x.title}>
              {x.body}
            </Article>
          ))}

          {hasChanges && (
            <Article id={CHANGES_ID} no="부칙" title="개정 이력">
              <dl className={s.rbTable}>
                {RULE_CHANGES.map((change) => (
                  <div key={change.date + change.text}>
                    <dt>{formatChangeDate(change.date)}</dt>
                    <dd>{change.text}</dd>
                  </div>
                ))}
              </dl>
            </Article>
          )}
        </article>
      </div>
    </>
  );
}
