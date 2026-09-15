import { AlertTriangle, ArrowLeftRight, Calendar, Check, Clock, LayoutGrid, MapPin, Plus, Sparkles, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mascot } from '../components/Mascot';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { useToast } from '../components/Toast';
import { headerBgStyle } from '../config/images';
import { DEFAULT_PLACES, mergePlaces, PLACE_MAX_LENGTH, readCustomPlaces, saveCustomPlace } from '../config/places';
import { DEFAULT_RULES, GAME_TYPE_LABEL, type GameType } from '../config/rules';
import { YAKUMAN_MAX_PER_GAME, YAKUMAN_NAME_MAX_LENGTH, YAKUMAN_NAMES, YAKUMAN_OTHER } from '../config/yakuman';
import { fromDateTimeInputs, toDateInput, toTimeInput } from '../lib/format';
import { computeResults, formatScore, scoreTotalDiff, tieGroups } from '../lib/scoring';
import { sortGamesDesc } from '../lib/stats';
import type { NewGame, Yakuman } from '../lib/types';
import { useData, useMemberMap } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import app from '../styles/App.module.css';
import s from './Record.module.css';

const PLAYER_COUNT = 4;
/** 장소 선택에서 "새 장소 추가" 를 뜻하는 특수 값 */
const NEW_PLACE = '__new__';

interface Slot {
  memberId: string;
  /** 입력 문자열 (빈 문자열 = 미입력) */
  score: string;
}

/** 역만 입력 행. name 이 '기타' 면 customName 을 씁니다. */
interface YakumanRow {
  playerId: string;
  name: string;
  customName: string;
}

function yakumanName(row: YakumanRow): string {
  return (row.name === YAKUMAN_OTHER ? row.customName : row.name).trim().slice(0, YAKUMAN_NAME_MAX_LENGTH);
}

function parseScore(raw: string): number | null {
  if (raw.trim() === '' || raw === '-') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function RecordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { status, members, games, addGame } = useData();
  const memberMap = useMemberMap();
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  const [gameType, setGameType] = useState<GameType>('hanchan');
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [time, setTime] = useState(() => toTimeInput(new Date()));

  // 장소: 기본 목록 + 기록에 쓰인 장소 + 이 기기에서 추가한 장소
  const [customPlaces, setCustomPlaces] = useState<string[]>(() => readCustomPlaces());
  const places = useMemo(() => mergePlaces(games.map((g) => g.place), customPlaces), [games, customPlaces]);
  const [place, setPlace] = useState('');
  const [placeDraft, setPlaceDraft] = useState('');
  const [addingPlace, setAddingPlace] = useState(false);

  const [yakumans, setYakumans] = useState<YakumanRow[]>([]);
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: PLAYER_COUNT }, () => ({ memberId: '', score: '' })));
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 멤버가 4명 이상이면 처음 4명을 기본 선택
  useEffect(() => {
    if (status !== 'ready') return;
    setSlots((prev) => {
      if (prev.some((p) => p.memberId)) return prev;
      return prev.map((p, i) => ({ ...p, memberId: activeMembers[i]?.id ?? '' }));
    });
  }, [status, activeMembers]);

  // 장소 기본값: 가장 최근 대국의 장소, 없으면 기본 목록의 첫 번째
  useEffect(() => {
    if (status !== 'ready') return;
    setPlace((prev) => {
      if (prev) return prev;
      const recent = sortGamesDesc(games).find((g) => g.place.trim())?.place;
      return recent ?? DEFAULT_PLACES[0] ?? '';
    });
  }, [status, games]);

  const onPlaceSelect = (value: string) => {
    if (value === NEW_PLACE) {
      setAddingPlace(true);
      setPlaceDraft('');
      return;
    }
    setPlace(value);
  };

  const commitNewPlace = () => {
    const v = placeDraft.trim().slice(0, PLACE_MAX_LENGTH);
    if (!v) {
      setAddingPlace(false);
      return;
    }
    if (!places.includes(v)) {
      saveCustomPlace(v);
      setCustomPlaces(readCustomPlaces());
    }
    setPlace(v);
    setAddingPlace(false);
    setPlaceDraft('');
  };

  // 참가자 선택이 바뀌어 참가자가 아니게 된 사람의 역만 행은 사람 선택을 비웁니다.
  const selectedIds = slots.map((p) => p.memberId).filter(Boolean);
  const addYakuman = () => setYakumans((prev) => (prev.length >= YAKUMAN_MAX_PER_GAME ? prev : [...prev, { playerId: selectedIds[0] ?? '', name: YAKUMAN_NAMES[0], customName: '' }]));
  const updateYakuman = (i: number, patch: Partial<YakumanRow>) => setYakumans((prev) => prev.map((y, idx) => (idx === i ? { ...y, ...patch } : y)));
  const removeYakuman = (i: number) => setYakumans((prev) => prev.filter((_, idx) => idx !== i));
  const yakumanIncomplete = yakumans.some((y) => !selectedIds.includes(y.playerId) || !yakumanName(y));

  const rules = DEFAULT_RULES;
  const scores = slots.map((p) => parseScore(p.score));
  const allScored = scores.every((v) => v !== null);
  const allSelected = slots.every((p) => p.memberId !== '');
  const duplicate = new Set(slots.map((p) => p.memberId).filter(Boolean)).size !== slots.filter((p) => p.memberId).length;
  const notHundred = scores.map((v) => v !== null && v % 100 !== 0);
  const hasNotHundred = notHundred.some(Boolean);

  const results = useMemo(() => {
    if (!allScored) return null;
    return computeResults(scores as number[], rules, gameType);
  }, [allScored, scores.join(','), rules, gameType]); // eslint-disable-line react-hooks/exhaustive-deps

  const ties = useMemo(() => (allScored ? tieGroups(scores as number[]) : []), [allScored, scores.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => (allScored ? scoreTotalDiff(scores as number[], rules, PLAYER_COUNT) : null), [allScored, scores.join(','), rules]); // eslint-disable-line react-hooks/exhaustive-deps
  const enteredSum = scores.reduce<number>((a, v) => a + (v ?? 0), 0);

  const canSave = status === 'ready' && allSelected && allScored && !duplicate && !hasNotHundred && !yakumanIncomplete && !saving;

  const updateSlot = (i: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const swapSlots = (a: number, b: number) =>
    setSlots((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });

  const buildGame = useCallback((): NewGame | null => {
    const playedAt = fromDateTimeInputs(date, time);
    if (!playedAt) return null;
    const yakumanList: Yakuman[] = yakumans.map((y) => ({ playerId: y.playerId, name: yakumanName(y) }));
    return {
      playedAt,
      place: place.trim().slice(0, PLACE_MAX_LENGTH),
      playerCount: PLAYER_COUNT,
      gameType,
      playerIds: slots.map((p) => p.memberId),
      scores: scores as number[],
      yakumans: yakumanList,
      rules: { ...rules, uma: [...rules.uma] as [number, number, number, number] },
    };
  }, [date, time, place, gameType, slots, scores, yakumans, rules]);

  const doSave = async () => {
    const game = buildGame();
    if (!game) {
      setSaveError('날짜와 시간을 확인해 주세요.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await addGame(game);
      toast('대국이 저장되었어요!');
      navigate('/', { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해 주세요.');
      setSaving(false);
    }
  };

  const onSubmit = () => {
    if (!canSave) return;
    if (total && total.diff !== 0) {
      setConfirmOpen(true);
      return;
    }
    void doSave();
  };

  const selectableFor = (i: number) =>
    activeMembers.filter((m) => m.id === slots[i].memberId || !slots.some((p, idx) => idx !== i && p.memberId === m.id));

  return (
    <>
      <PageHeader title="대국 기록하기" back className={app.headerImage} style={headerBgStyle('record')}>
        <div className={s.headerBody}>
          <p className={s.headerHint}>점수를 입력하면 순위와 우마가 바로 계산돼요.</p>
          <Mascot name="record" className={s.headerMascot} />
        </div>
      </PageHeader>

      <div className={app.page}>
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          noValidate
        >
          <div className={s.chips}>
            <label className={s.chip}>
              <Users size={18} />
              <span className={s.chipLabel}>인원</span>
              <select className={s.chipSelect} value={PLAYER_COUNT} disabled aria-label="대국 인원">
                <option value={4}>4인</option>
              </select>
            </label>
            <label className={s.chip}>
              <LayoutGrid size={18} />
              <span className={s.chipLabel}>방식</span>
              <select className={s.chipSelect} value={gameType} onChange={(e) => setGameType(e.target.value as GameType)} aria-label="대국 방식">
                {(Object.keys(GAME_TYPE_LABEL) as GameType[]).map((k) => (
                  <option key={k} value={k}>
                    {GAME_TYPE_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={s.dateRow}>
            <label className={s.dateChip}>
              <Calendar size={18} />
              <input type="date" className={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} required aria-label="대국 날짜" />
            </label>
            <label className={s.dateChip}>
              <Clock size={18} />
              <input type="time" className={s.dateInput} value={time} onChange={(e) => setTime(e.target.value)} required aria-label="대국 시간" />
            </label>
          </div>

          <Card className={s.titleCard}>
            <div className={ui.field}>
              <span className={ui.label}>
                <MapPin size={15} /> 장소
              </span>
              {addingPlace ? (
                <div className={s.placeAdd}>
                  <input
                    className={ui.input}
                    value={placeDraft}
                    onChange={(e) => setPlaceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitNewPlace();
                      }
                    }}
                    placeholder="새 장소 이름"
                    maxLength={PLACE_MAX_LENGTH}
                    autoFocus
                    autoComplete="off"
                    aria-label="새 장소 이름"
                  />
                  <Button type="button" variant="primary" size="sm" onClick={commitNewPlace} disabled={!placeDraft.trim()}>
                    추가
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAddingPlace(false)}>
                    취소
                  </Button>
                </div>
              ) : (
                <div className={s.placeRow}>
                  <select className={[ui.input, s.placeSelect].join(' ')} value={place} onChange={(e) => onPlaceSelect(e.target.value)} aria-label="대국 장소">
                    {places.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={NEW_PLACE}>＋ 새 장소 추가…</option>
                  </select>
                  <Button type="button" variant="outline" size="sm" icon={<Plus size={16} />} onClick={() => onPlaceSelect(NEW_PLACE)} aria-label="새 장소 추가">
                    추가
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {activeMembers.length < PLAYER_COUNT && status === 'ready' && (
            <div className={[s.notice, s.noticeWarn].join(' ')}>
              <AlertTriangle size={16} />
              <div>
                활성 멤버가 {activeMembers.length}명뿐이에요. 멤버 화면에서 {PLAYER_COUNT - activeMembers.length}명을 더 추가해 주세요.
              </div>
            </div>
          )}

          {slots.map((slot, i) => {
            const member = slot.memberId ? memberMap.get(slot.memberId) : undefined;
            const r = results?.[i];
            const invalid = notHundred[i] || (slot.memberId !== '' && slots.some((p, idx) => idx !== i && p.memberId === slot.memberId));
            return (
              <Card key={i} className={[s.playerCard, r?.tied ? s.playerCardTied : '', invalid ? s.playerCardInvalid : ''].join(' ')}>
                <div className={s.playerLeft}>
                  {member && <Avatar member={member} size={40} />}
                  <select
                    className={[s.playerSelect, slot.memberId ? '' : s.playerSelectEmpty].join(' ')}
                    value={slot.memberId}
                    onChange={(e) => updateSlot(i, { memberId: e.target.value })}
                    aria-label={`${i + 1}번 참가자`}
                  >
                    <option value="">참가자 선택</option>
                    {selectableFor(i).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.scoreWrap}>
                  <input
                    className={s.scoreInput}
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    placeholder="점수"
                    value={slot.score}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
                      updateSlot(i, { score: v });
                    }}
                    aria-label={`${member?.name ?? `${i + 1}번 참가자`} 최종 점수`}
                    aria-invalid={notHundred[i] || undefined}
                    enterKeyHint="next"
                  />
                  {slot.score !== '' && (
                    <button type="button" className={s.scoreClear} onClick={() => updateSlot(i, { score: '' })} aria-label="점수 지우기" tabIndex={-1}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className={s.result}>
                  {r ? (
                    <>
                      <Points value={r.points} className={[s.resultPoints, r.points > 0 ? s.resultPos : r.points < 0 ? s.resultNeg : s.resultZero].join(' ')} />
                      <RankBadge rank={r.rank} />
                    </>
                  ) : (
                    <span className={s.resultEmpty}>{notHundred[i] ? '100점 단위' : '우마 · 순위'}</span>
                  )}
                </div>
              </Card>
            );
          })}

          <div className={s.sumRow}>
            <span>점수 합계</span>
            <strong className={total && total.diff !== 0 ? 'neg' : ''}>
              {formatScore(enteredSum)} / {formatScore(rules.startPoints * PLAYER_COUNT)}
              {total && total.diff !== 0 && ` (${total.diff > 0 ? '+' : ''}${formatScore(total.diff)})`}
            </strong>
          </div>

          {duplicate && (
            <div className={[s.notice, s.noticeError].join(' ')}>
              <AlertTriangle size={16} />
              <div>같은 멤버가 두 번 선택되었어요. 참가자를 다시 골라주세요.</div>
            </div>
          )}

          {hasNotHundred && (
            <div className={[s.notice, s.noticeError].join(' ')}>
              <AlertTriangle size={16} />
              <div>점수는 100점 단위로 입력해 주세요.</div>
            </div>
          )}

          {ties.length > 0 && (
            <div className={[s.notice, s.noticeWarn].join(' ')}>
              <AlertTriangle size={16} />
              <div>
                <strong>동점이 있어요.</strong> 기본은 위쪽(먼저 입력한) 사람이 상위예요. 순위를 바꾸려면 아래 버튼으로 순서를 조정해 주세요.
                <div className={s.noticeActions}>
                  {ties.flatMap((group) =>
                    group.slice(0, -1).map((a, k) => {
                      const b = group[k + 1];
                      const nameA = memberMap.get(slots[a].memberId)?.name ?? `${a + 1}번`;
                      const nameB = memberMap.get(slots[b].memberId)?.name ?? `${b + 1}번`;
                      return (
                        <button key={`${a}-${b}`} type="button" className={s.swapBtn} onClick={() => swapSlots(a, b)}>
                          <ArrowLeftRight size={13} />
                          {nameA} ↔ {nameB}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          )}

          <Card className={s.titleCard}>
            <div className={ui.field}>
              <span className={ui.label}>
                <Sparkles size={15} /> 역만 <span className={ui.labelOptional}>(있을 때만)</span>
              </span>
              {yakumans.length === 0 && <span className={ui.help}>이번 대국에서 역만이 나왔다면 누가 무슨 역만을 냈는지 남겨 두세요.</span>}
              {yakumans.map((y, i) => (
                <div key={i} className={s.yakumanRow}>
                  <select
                    className={[ui.input, s.yakumanSelect].join(' ')}
                    value={y.playerId}
                    onChange={(e) => updateYakuman(i, { playerId: e.target.value })}
                    aria-label={`${i + 1}번 역만을 낸 사람`}
                  >
                    <option value="">누가</option>
                    {selectedIds.map((id) => (
                      <option key={id} value={id}>
                        {memberMap.get(id)?.name ?? id}
                      </option>
                    ))}
                  </select>
                  <select
                    className={[ui.input, s.yakumanSelect].join(' ')}
                    value={y.name}
                    onChange={(e) => updateYakuman(i, { name: e.target.value })}
                    aria-label={`${i + 1}번 역만 이름`}
                  >
                    {YAKUMAN_NAMES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value={YAKUMAN_OTHER}>{YAKUMAN_OTHER} (직접 입력)</option>
                  </select>
                  <button type="button" className={s.yakumanRemove} onClick={() => removeYakuman(i)} aria-label="역만 삭제">
                    <Trash2 size={16} />
                  </button>
                  {y.name === YAKUMAN_OTHER && (
                    <input
                      className={[ui.input, s.yakumanCustom].join(' ')}
                      value={y.customName}
                      onChange={(e) => updateYakuman(i, { customName: e.target.value })}
                      placeholder="역만 이름을 직접 입력"
                      maxLength={YAKUMAN_NAME_MAX_LENGTH}
                      autoComplete="off"
                      aria-label={`${i + 1}번 역만 이름 직접 입력`}
                    />
                  )}
                </div>
              ))}
              {yakumanIncomplete && (
                <span className={[ui.help, ui.helpError].join(' ')}>역만을 낸 사람과 역만 이름을 모두 골라 주세요.</span>
              )}
              {yakumans.length < YAKUMAN_MAX_PER_GAME && (
                <Button type="button" variant="outline" size="sm" icon={<Plus size={16} />} onClick={addYakuman} disabled={selectedIds.length === 0} className={s.yakumanAdd}>
                  역만 추가
                </Button>
              )}
            </div>
          </Card>

          {saveError && (
            <div className={[s.notice, s.noticeError].join(' ')} role="alert">
              <AlertTriangle size={16} />
              <div>{saveError}</div>
            </div>
          )}

          <div className={s.saveWrap}>
            <Button type="submit" variant="danger" full decorated className={s.save} disabled={!canSave} loading={saving} icon={<Check size={22} strokeWidth={3} />}>
              저장하기
            </Button>
          </div>
        </form>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          <>
            <AlertTriangle size={20} color="#C83D32" /> 점수 합계가 맞지 않아요
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              다시 확인
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => {
                setConfirmOpen(false);
                void doSave();
              }}
            >
              그래도 저장
            </Button>
          </>
        }
      >
        4인 대국의 점수 합계는 보통 {formatScore(rules.startPoints * PLAYER_COUNT)}점이에요. 입력한 점수를 한 번 더 확인해 주세요.
        {total && (
          <div style={{ marginTop: 10 }}>
            <div className={s.confirmLine}>
              <span>입력한 합계</span>
              <strong className="num">{formatScore(total.total)}점</strong>
            </div>
            <div className={s.confirmLine}>
              <span>차이</span>
              <strong className="num neg">
                {total.diff > 0 ? '+' : ''}
                {formatScore(total.diff)}점
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
