# 마작 고수들의 모임

> 좋은 패, 좋은 사람들.

친구 모임용 리치마작 대국 기록 웹앱입니다. 모바일 브라우저에서 쓰는 것을 기본으로 하며, 친구들이 각자 폰으로 접속해 같은 기록을 보고 입력할 수 있습니다.

- 대국 기록: 4인 반장전/동풍전, 참가자는 가장 최근 대국 멤버가 기본 선택, 장소 선택(기본 마작카페·이수마장 + 직접 추가), 최종 점수 입력 → 순위·우마 자동 계산 (작혼 방식), 역만이 나왔으면 누가 무슨 역만인지 기록
- 홈 (모두 같은 화면): 이번 달 모임 현황 → 이번 달 랭킹(MVP) → 최근 대국 → 후원 현황 순서
  - 모임 현황은 카드 한 장에 대국 수 / 최다 참여 / 누적 우마 1위 / 평균 우마 1위를 2×2 로 작게 담고, 누르면 이번 달 월별 현황(`/ranking/YYYY-MM`)으로
  - 후원 현황은 진행 중인 후원을 최대 2개(더 있으면 "외 N개의 후원 보기"), 최근 달성한 후원이 있으면 한 줄(지급 대기 / 지급 완료). 진행 중인 후원이 없어도 후원 화면으로 가는 입구로 작게 남음
- 기록: 월별 필터, 상세 보기, 삭제
- 랭킹: 월별 / 전체 기간, 누적 우마 기준. **명예의 전당** 탭에서 달마다 1위와 역만을 낸 사람을 최신 달부터 모아 보기 (이번 달은 "진행 중"). 달 카드를 누르면 그 달 현황(홈과 같은 통계 카드·월간 랭킹·역만·그 달 대국 전체)을 `/ranking/YYYY-MM` 에서 보기
- 내 기록: 각자 자기 폰에서 "나"를 고르면 참여 횟수 / 1위 횟수 / 라스 횟수 / 평균 우마 (지난달 대비), 순위 분포, 내가 참여한 대국과 역만
- 멤버: 추가·수정, 캐릭터(아바타) 이미지 선택, 대국 기록이 있는 멤버는 비활성 처리
- 후원 (`/sponsors`, 홈의 후원 현황 카드에서 들어감): 누군가 조건을 걸고 상품을 거는 것 (예: 1호 역만 → 메가커피 기프티콘). 진행 중 / 달성(지급 대기) / 지급 완료로 나눠 보기, 추가·수정·삭제, 카드를 눌러 상태 바꾸기(달성한 사람·달성일, 상품 지급일). 후원자는 멤버 중에서 고르거나 이름을 직접 입력. **사람마다 달성**을 켜면 한 후원을 각자 한 번씩 달성할 수 있음 (예: 각자 1호 역만이면 사 주기) — 카드의 '달성 처리'로 달성한 사람을 쌓고, 사람마다 지급 대기/지급 완료를 따로 표시

## 기술 스택

- React 18 + TypeScript + Vite
- CSS Modules (Tailwind 미사용), 아이콘 [lucide-react](https://lucide.dev/)
- Vercel Serverless Functions (`/api/*`) + Upstash Redis (`@upstash/redis`)
- 환경 변수가 없으면 자동으로 브라우저 `localStorage` 저장소로 동작
- 앱을 다시 열면 이 기기에 저장해 둔 지난번 서버 데이터(`localStorage` 의 `mahjong.remoteSnapshot`)를 먼저 보여 주고, 서버의 최신 데이터를 받는 대로 바꿔 끼움
- 단위 테스트: Vitest (`src/lib/scoring.ts`, `src/lib/stats.ts`, `src/lib/sponsors.ts`, 저장소, API 핸들러)

## 폴더 구조

```
api/
  bootstrap.ts            # GET /api/bootstrap — 앱을 열 때 멤버·대국·후원을 한 번에 (클라이언트가 저장소를 고를 때도 사용)
  health.ts               # Redis 설정 여부 확인 (배포 후 점검용)
  members/index.ts        # GET, POST /api/members
  members/[id].ts         # PUT /api/members/:id
  games/index.ts          # GET, POST /api/games
  games/[id].ts           # DELETE /api/games/:id
  sponsors/index.ts       # GET, POST /api/sponsors
  sponsors/[id].ts        # PUT, DELETE /api/sponsors/:id
  _lib/                   # Redis 저장소, 공통 HTTP 처리, 핸들러 본문, 초기 멤버 시드 원본, 예전 기록 형식 변환, 후원 입력 검증
  package.json / tsconfig.json  # 서버리스 함수는 CommonJS 로 컴파일 (확장자 없는 import 호환)
src/
  config/rules.ts         # 정산 규칙 (시작점·반환점·우마·동풍전 배율)
  config/places.ts        # 대국 장소 기본 목록 + 이 기기에서 추가한 장소
  config/yakuman.ts       # 역만 이름 목록
  config/images.ts        # 마스코트·아바타 이미지 경로 규칙
  config/seedMembers.ts   # 초기 멤버 (api/_lib/seedMembers.ts 재수출)
  lib/scoring.ts          # 순위·우마·정산 점수 계산 (순수 함수)
  lib/stats.ts            # 월별 통계·랭킹 계산 (순수 함수)
  lib/sponsors.ts         # 후원 상태별 정리·최근 달성 고르기 (순수 함수)
  lib/storage/            # StorageAdapter 인터페이스 + RemoteStorage / LocalStorage 구현
  state/                  # DataProvider (멤버·대국·후원 상태), useMe (이 기기의 "나")
  components/             # 공용 UI (버튼, 카드, 아바타, 순위 배지, 통계 카드, 하단 내비 등)
  pages/                  # 홈 / 대국 기록 / 기록 목록·상세 / 랭킹·명예의 전당·월별 현황 / 내 기록 / 멤버 / 후원
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

두 값이 모두 있어야 서버가 Redis 를 사용합니다. 없으면 `/api/bootstrap` 이 503(`STORAGE_NOT_CONFIGURED`)을 돌려주고 클라이언트는 자동으로 localStorage 저장소로 전환합니다. (`/api/health` 를 브라우저로 열면 설정 여부를 `{ ok: true/false }` 로 확인할 수 있습니다.)
(Vercel Marketplace 에서 Upstash 를 연동하면 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 이름으로 주입되는 경우도 있는데, 이 이름도 인식합니다.)

빌드 시 `VITE_STORAGE=local` 을 주면 API 와 상관없이 항상 localStorage 만 사용합니다 (데모용).

## Vercel + Upstash 배포

1. 이 저장소를 GitHub 에 푸시하고 [Vercel](https://vercel.com/new) 에서 **Import** 합니다. 프레임워크는 Vite 로 자동 감지되며 `vercel.json` 에 빌드·출력 설정과 SPA 리라이트가 들어 있습니다.
2. Vercel 프로젝트의 **Storage** 탭 → **Create Database** → **Upstash Redis** 를 선택해 연결합니다. 연결하면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 환경 변수가 프로젝트에 자동으로 추가됩니다.
   - Upstash 콘솔에서 직접 만든 경우에는 데이터베이스의 **REST API** 값을 Vercel 프로젝트 **Settings → Environment Variables** 에 같은 이름으로 넣어 주세요.
3. 환경 변수를 추가한 뒤 **Redeploy** 합니다. 배포 주소 뒤에 `/api/health` 를 붙여 열었을 때 `{"ok":true,"storage":"redis"}` 가 보이면 성공입니다.

> **저장소 공개 여부 주의** — Vercel 무료(Hobby) 플랜에서 GitHub 저장소를 **비공개**로 두면, Vercel 계정 주인이 아닌 사람이 작성한 커밋(다른 GitHub 계정으로 머지한 PR 등)은 배포되지 않고 Deployments 에 **Blocked** 로 표시됩니다. 이 저장소는 공개로 두는 것을 전제로 합니다. 비공개로 써야 한다면 Vercel **Settings → Git → Deploy Hooks** 로 배포 주소를 만들어 머지 후 호출하거나, Pro 플랜에서 작성자를 팀원으로 추가해야 합니다. (저장소를 비공개로 해도 앱 데이터는 Redis 에 있고 사이트는 주소만 알면 열리므로, 가려지는 것은 코드뿐입니다.)

초기 멤버는 `api/_lib/seedMembers.ts` 에서 바꿉니다. 예전 초기 멤버(연경·민수·지수·현우)가 손대지 않은 채 남아 있고 대국 기록이 없으면 첫 접속 때 자동으로 새 초기 멤버로 교체됩니다.

Redis 에는 다음 세 키만 사용합니다.

| 키 | 형식 |
| --- | --- |
| `mahjong:members` | 멤버 JSON 배열 |
| `mahjong:games` | 대국 ID → 대국 JSON 해시 |
| `mahjong:sponsors` | 후원 ID → 후원 JSON 해시 (제목·조건·상품·후원자·상태·달성자·달성일·지급일, 사람마다 달성이면 사람별 달성 기록) |

## 이미지 넣는 위치

이미지는 저장소의 `public/images/` 아래에 직접 넣습니다. 경로 규칙은 `src/config/images.ts` 한 곳에서 관리합니다.

| 용도 | 경로 |
| --- | --- |
| 홈 왼쪽 위 로고 | `public/images/logo.png` (정사각형, 투명 배경) — 없으면 發 패 모양 기본 로고 |
| 홈 상단 배경 | `public/images/bg/home.webp` (가로 2:1) |
| 기록 화면 상단 배경 | `public/images/bg/record.webp` (가로 2:1) |
| 홈 마스코트 | `public/images/mascot/home.webp` (투명 배경) |
| 기록 화면 마스코트 | `public/images/mascot/record.webp` (투명 배경) |
| 멤버 아바타 후보 | `public/images/avatars/*.webp` 또는 `*.png` (파일명 자유) |

- `public/images/avatars/` 에 넣은 WebP·PNG 는 빌드 시 자동으로 수집되어 멤버 추가·수정 화면의 **캐릭터** 선택 격자에 나타납니다. 파일을 추가하고 다시 배포하면 바로 고를 수 있습니다. 같은 이름의 `.webp` 와 `.png` 가 함께 있으면 `.webp` 를 씁니다.
- 멤버가 아직 캐릭터를 고르지 않았으면 `<멤버ID>.webp`(또는 `.png`) 파일이 있을 때 그 파일을 씁니다. 초기 멤버의 ID 는 `yeonkyung`(연경), `youngsik`(영식), `sowon`(소원), `chanyoung`(찬영) 입니다.
- 예전에 `xxx.png` 로 골라 둔 캐릭터는 같은 이름의 `xxx.webp` 가 있으면 자동으로 그 파일을 씁니다.
- 이미지가 없거나 로드에 실패하면 아바타 영역은 숨겨지고 이름만 표시되며, 마스코트가 없으면 여백만 남습니다.
- 마스코트는 투명 배경을, 아바타는 정사각형을 권장합니다.
- 용량: 화면에 보이는 크기에 맞춰 배경은 1280px WebP(30~40KB), 마스코트는 360px WebP(25~30KB), 아바타는 192px WebP(한 장에 6KB 안팎)로 줄여 두었습니다. 새 그림을 올릴 때도 비슷하게 줄이면 폰에서 빠르게 뜹니다.
- `/images/*` 는 브라우저에 하루 동안 캐시됩니다 (`vercel.json`). 같은 파일명으로 그림을 바꾸면 폰에 따라 하루 정도 예전 그림이 보일 수 있으니, 바꿀 때는 새 파일명을 쓰는 편이 확실합니다.

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
