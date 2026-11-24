/**
 * 규칙 탭(룰북)의 글.
 * 정산 점수(기본 점수·우마·오카)는 rules.ts 의 DEFAULT_RULES 에서 자동으로 만들어지므로 여기에 쓰지 않습니다.
 * 모임 규칙을 더하려면 HOUSE_RULES 에 { title, items } 를 추가하세요. 정산 점수 아래에 순서대로 보입니다.
 */
export interface RuleSection {
  title: string;
  items: string[];
}

/** 정산 점수 외의 모임 규칙 (예: 적도라, 쿠이탄, 매너) */
export const HOUSE_RULES: RuleSection[] = [];

export interface RuleChange {
  /** 'YYYY-MM' 또는 'YYYY-MM-DD' */
  date: string;
  text: string;
}

/** 바뀐 기록 (최근 것부터) */
export const RULE_CHANGES: RuleChange[] = [
  {
    date: '2026-11',
    text: '반장전 우마 +15/+5/−5/−15 → +20/+10/−10/−20 (동풍전은 그 절반). 11월 1일 대국부터 적용되고, 10월까지 기록은 예전 우마로 계산돼요.',
  },
];
