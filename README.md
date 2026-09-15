# 마작 고수들의 모임

> 좋은 패, 좋은 사람들.

친구 모임용 리치마작 대국 기록 웹앱입니다. 모바일 브라우저에서 쓰는 것을 기본으로 하며, 친구들이 각자 폰으로 접속해 같은 기록을 보고 입력할 수 있습니다.

- 대국 기록: 4인 반장전/동풍전, 최종 점수 입력 → 순위·우마 자동 계산 (작혼 방식)
- 홈 (모두 같은 화면): 이번 달 대국 수 / 참여 멤버 / 1위 최다 / 라스 최다 (지난달 대비), 이번 달 랭킹(MVP), 최근 대국
- 기록: 월별 필터, 상세 보기, 삭제
- 랭킹: 월별 / 전체 기간, 누적 우마 기준
- 내 기록: 각자 자기 폰에서 "나"를 고르면 평균 순위 / 1위 횟수 / 라스 횟수 / 누적 우마 (지난달 대비), 순위 분포, 내가 참여한 대국
- 멤버: 추가·수정, 캐릭터(아바타) 이미지 선택, 대국 기록이 있는 멤버는 비활성 처리

## 기술 스택

- React 18 + TypeScript + Vite
- CSS Modules (Tailwind 미사용), 아이콘 [lucide-react](https://lucide.dev/)
- Vercel Serverless Functions (`/api/*`) + Upstash Redis (`@upstash/redis`)
- 환경 변수가 없으면 자동으로 브라우저 `localStorage` 저장소로 동작
- 단위 테스트: Vitest (`src/lib/scoring.ts`, `src/lib/stats.ts`, 저장소, API 핸들러)

## 폴더 구조

```
api/
  health.ts               # Redis 설정 여부 확인 (클라이언트가 저장소를 고를 때 사용)
  members/index.ts        # GET, POST /api/members
  members/[id].ts         # PUT /api/members/:id
  games/index.ts          # GET, POST /api/games
  games/[id].ts           # DELETE /api/games/:id
  _lib/                   # Redis 저장소, 공통 HTTP 처리, 핸들러 본문, 초기 멤버 시드 원본
  package.json / tsconfig.json  # 서버리스 함수는 CommonJS 로 컴파일 (확장자 없는 import 호환)
src/
  config/rules.ts         # 정산 규칙 (시작점·반환점·우마·동풍전 배율)
  config/images.ts        # 마스코트·아바타 이미지 경로 규칙
  config/seedMembers.ts   # 초기 샘플 멤버 (api/_lib/seedMembers.ts 재수출)
  lib/scoring.ts          # 순위·우마·정산 점수 계산 (순수 함수)
  lib/stats.ts            # 월별 통계·랭킹 계산 (순수 함수)
  lib/storage/            # StorageAdapter 인터페이스 + RemoteStorage / LocalStorage 구현
  state/                  # DataProvider (멤버·대국 상태), useMe (이 기기의 "나")
  components/             # 공용 UI (버튼, 카드, 아바타, 순위 배지, 통계 카드, 하단 내비 등)
  pages/                  # 홈 / 대국 기록 / 기록 목록·상세 / 랭킹 / 내 기록 / 멤버
public/images/            # 마스코트·아바타 이미지 (직접 추가)
```

## 로컬 개발

```bash
npm install
npm run dev          # Vite 만 실행 → /api 가 없으므로 localStorage 폴백으로 동작
npm run dev:vercel   # vercel dev → Vite + /api 서버리스 함수 함께 실행 (Vercel 로그인 필요)
npm test             # 단위 테스트
npm run typecheck    # 타입 검사
npm run build        # 타입 검사 + 프로덕션 빌드
```

`vercel dev` 로 실행할 때 `.env.local` 에 Upstash 값을 넣으면 Redis 모드로, 비워 두면 localStorage 폴백으로 동작합니다.
`vercel env pull .env.local` 로 Vercel 프로젝트의 환경 변수를 내려받을 수도 있습니다.

## 환경 변수

`.env.example` 을 참고하세요.

| 변수 | 설명 |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 토큰 |

두 값이 모두 있어야 서버가 Redis 를 사용합니다. 없으면 `/api/health` 가 `{ ok: false }` 를 돌려주고 클라이언트는 자동으로 localStorage 저장소로 전환합니다.
(Vercel Marketplace 에서 Upstash 를 연동하면 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 이름으로 주입되는 경우도 있는데, 이 이름도 인식합니다.)

빌드 시 `VITE_STORAGE=local` 을 주면 API 와 상관없이 항상 localStorage 만 사용합니다 (데모용).

## Vercel + Upstash 배포

1. 이 저장소를 GitHub 에 푸시하고 [Vercel](https://vercel.com/new) 에서 **Import** 합니다. 프레임워크는 Vite 로 자동 감지되며 `vercel.json` 에 빌드·출력 설정과 SPA 리라이트가 들어 있습니다.
2. Vercel 프로젝트의 **Storage** 탭 → **Create Database** → **Upstash Redis** 를 선택해 연결합니다. 연결하면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 환경 변수가 프로젝트에 자동으로 추가됩니다.
   - Upstash 콘솔에서 직접 만든 경우에는 데이터베이스의 **REST API** 값을 Vercel 프로젝트 **Settings → Environment Variables** 에 같은 이름으로 넣어 주세요.
3. 환경 변수를 추가한 뒤 **Redeploy** 합니다. 홈 화면 맨 아래에 "공유 저장소(Redis)에 연결됨" 이 표시되면 성공입니다.

Redis 에는 다음 두 키만 사용합니다.

| 키 | 형식 |
| --- | --- |
| `mahjong:members` | 멤버 JSON 배열 |
| `mahjong:games` | 대국 ID → 대국 JSON 해시 |

## 이미지 넣는 위치

이미지는 저장소의 `public/images/` 아래에 직접 넣습니다. 경로 규칙은 `src/config/images.ts` 한 곳에서 관리합니다.

| 용도 | 경로 |
| --- | --- |
| 홈 마스코트 | `public/images/mascot/home.png` |
| 기록 화면 마스코트 | `public/images/mascot/record.png` |
| 멤버 아바타 후보 | `public/images/avatars/*.png` (파일명 자유) |

- `public/images/avatars/` 에 넣은 PNG 는 빌드 시 자동으로 수집되어 멤버 추가·수정 화면의 **캐릭터** 선택 격자에 나타납니다. 파일을 추가하고 다시 배포하면 바로 고를 수 있습니다.
- 멤버가 아직 캐릭터를 고르지 않았으면 `<멤버ID>.png` 파일이 있을 때 그 파일을 씁니다. 초기 샘플 멤버의 ID 는 `yeonkyung`(연경), `minsu`(민수), `jisu`(지수), `hyunwoo`(현우) 입니다.
- 이미지가 없거나 로드에 실패하면 아바타 영역은 숨겨지고 이름만 표시되며, 마스코트가 없으면 여백만 남습니다.
- 마스코트는 투명 배경 PNG 를 권장하고, 아바타는 정사각형(예: 240×240)을 권장합니다.

## 정산 규칙 바꾸기

`src/config/rules.ts` 의 `DEFAULT_RULES` 를 수정하면 됩니다.

```ts
export const DEFAULT_RULES: ScoringRules = {
  startPoints: 25000,        // 시작 점수
  returnPoints: 25000,       // 반환 점수 (오카를 쓰려면 30000 등으로)
  uma: [15, 5, -5, -15],     // 1위 → 4위 우마
  tonpuuUmaMultiplier: 1,    // 동풍전 우마 배율
};
```

계산식: `(최종 점수 − 반환 점수) ÷ 1,000 + 순위 우마`
예) 38,200 / 27,600 / 21,400 / 12,800 → +28.2 / +7.6 / −8.6 / −27.2 (합계 0)

대국 기록에는 저장 당시의 규칙이 함께 저장되므로 규칙을 바꿔도 과거 기록의 정산 결과는 그대로 유지됩니다.

## 이번 단계에서 제외한 것

로그인, 친구 초대, 알림 기능은 구현하지 않았습니다. 홈 헤더의 알림 아이콘은 자리만 있습니다.
홈 화면은 누가 접속하든 같은 공용 화면이고, "내 기록" 탭의 "나" 는 각자 자기 기기에서 고른 멤버로 localStorage 에만 기억됩니다.
