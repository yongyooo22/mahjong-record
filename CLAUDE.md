# CLAUDE.md

이 저장소에서 작업할 때 지켜야 할 규칙입니다. 앱 소개·폴더 구조·명령어는 [README.md](README.md) 를 보세요.

## Redis 는 다른 앱과 함께 씁니다

이 앱의 Upstash Redis 데이터베이스에는 다른 앱(`boardgame:` 등)의 데이터도 함께 들어 있습니다. 다른 앱의 데이터가 지워지거나 바뀌지 않도록 아래 규칙을 반드시 지켜 주세요.

- 이 앱이 쓰는 Redis 키는 모두 `mahjong:` 로 시작해야 합니다. 지금 쓰는 키는 아래 두 개가 전부이고, Redis 접근은 `api/_lib/store.ts` 한 곳에서만 합니다.

  | 키 | 형식 | 쓰는 명령 |
  | --- | --- | --- |
  | `mahjong:members` | 문자열 (멤버 JSON 배열) | `GET`, `SET` |
  | `mahjong:games` | 해시 (대국 ID → 대국 JSON) | `HGETALL`, `HSET`, `HDEL` |

- `mahjong:` 로 시작하지 않는 키는 조회·수정·삭제하지 않습니다.
- `FLUSHDB`, `FLUSHALL`, `KEYS`, `*` 같은 전체 와일드카드 삭제처럼 DB 전체에 영향을 주는 작업은 하지 않습니다. Upstash 의 백업 복원(Restore)도 대상 DB 의 기존 데이터를 모두 지운 뒤 복원하므로 이 DB 에는 쓰지 않습니다.
- 데이터 정리·초기화 기능은 위 표의 키를 이름으로 지정해서 지웁니다. 패턴이 꼭 필요하면 콜론까지 넣은 `mahjong:*` 로 `SCAN` 합니다 (`mahjong*` 는 `mahjong` 으로 시작하는 다른 접두어의 키까지 걸립니다).
- 키를 새로 만들거나 형식을 바꿀 때도 `mahjong:` 아래에서만 하고, 위 표와 README 의 키 표를 함께 고칩니다.
