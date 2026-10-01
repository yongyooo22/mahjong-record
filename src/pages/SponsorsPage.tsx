import { ChevronDown, Gift, PartyPopper, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { SPONSOR_CONDITION_MAX, SPONSOR_NAME_MAX, SPONSOR_PRIZE_MAX, SPONSOR_TITLE_MAX } from '../../api/_lib/sponsors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Segmented';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { formatDateShortYear, fromDateTimeInputs, toDateInput } from '../lib/format';
import { groupSponsors, SPONSOR_STATUS_LABEL, sponsorDisplayName } from '../lib/sponsors';
import type { Member, NewSponsor, Sponsor, SponsorAchievement, SponsorStatus } from '../lib/types';
import { useData, useMemberMap } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import app from '../styles/App.module.css';
import pages from './Pages.module.css';
import { PayoutChip, SponsorStatusChip } from './SponsorSections';
import s from './Sponsors.module.css';

/** 후원자 선택에서 "직접 입력"(멤버가 아닌 사람)을 뜻하는 특수 값 */
const CUSTOM_SPONSOR = '__custom__';

const GROUPS: { status: SponsorStatus; label: string }[] = [
  { status: 'open', label: '진행 중' },
  { status: 'achieved', label: '달성 · 지급 대기' },
  { status: 'paid', label: '지급 완료' },
];

const STATUS_OPTIONS = (Object.keys(SPONSOR_STATUS_LABEL) as SponsorStatus[]).map((value) => ({ value, label: SPONSOR_STATUS_LABEL[value] }));

const STATUS_TOAST: Record<SponsorStatus, string> = {
  open: '진행 중으로 바꿨어요.',
  achieved: '달성으로 표시했어요.',
  paid: '상품 지급 완료로 표시했어요.',
};

interface FormState {
  title: string;
  condition: string;
  prize: string;
  /** 후원자 멤버 ID. 직접 입력이면 CUSTOM_SPONSOR, 아직 안 골랐으면 '' */
  sponsorPick: string;
  sponsorCustom: string;
  /** 사람마다 한 번씩 달성할 수 있는 후원 */
  repeat: boolean;
  status: SponsorStatus;
  achieverId: string;
  /** YYYY-MM-DD */
  achievedDate: string;
  paidDate: string;
}

function initialForm(target: Sponsor | 'new', memberMap: Map<string, Member>): FormState {
  const today = toDateInput(new Date());
  if (target === 'new') {
    return { title: '', condition: '', prize: '', sponsorPick: '', sponsorCustom: '', repeat: false, status: 'open', achieverId: '', achievedDate: today, paidDate: today };
  }
  const isMember = target.sponsorId !== null && memberMap.has(target.sponsorId);
  return {
    title: target.title,
    condition: target.condition,
    prize: target.prize,
    sponsorPick: isMember ? target.sponsorId! : CUSTOM_SPONSOR,
    sponsorCustom: isMember ? '' : target.sponsorName,
    repeat: target.repeat,
    status: target.status,
    achieverId: target.achieverId ?? '',
    achievedDate: target.achievedAt ? toDateInput(new Date(target.achievedAt)) : today,
    paidDate: target.paidAt ? toDateInput(new Date(target.paidAt)) : today,
  };
}

/** 폼 → 저장할 값. 빠진 값이 있으면 안내 문구를 돌려줍니다. 날짜는 그날 정오로 저장합니다. */
function toSponsorInput(form: FormState, memberMap: Map<string, Member>, current: Sponsor | null): NewSponsor | string {
  const title = form.title.trim();
  if (!title) return '제목을 입력해 주세요.';
  const prize = form.prize.trim();
  if (!prize) return '상품을 입력해 주세요.';
  const custom = form.sponsorPick === CUSTOM_SPONSOR;
  const sponsorName = custom ? form.sponsorCustom.trim() : (memberMap.get(form.sponsorPick)?.name ?? '');
  if (!sponsorName) return custom ? '후원자 이름을 입력해 주세요.' : '후원자를 골라 주세요.';
  const sponsor = { title, condition: form.condition.trim(), prize, sponsorId: custom ? null : form.sponsorPick, sponsorName };
  if (form.repeat) {
    // 사람마다 달성: 달성 기록은 카드의 '달성 처리'로 따로 쌓으므로 그대로 둡니다.
    const achievements = current?.repeat ? current.achievements : [];
    return { ...sponsor, status: 'open', achieverId: null, achievedAt: null, paidAt: null, repeat: true, achievements };
  }
  const achieved = form.status !== 'open';
  if (achieved && !form.achieverId) return '달성한 사람을 골라 주세요.';
  const achievedAt = achieved ? fromDateTimeInputs(form.achievedDate, '12:00') : null;
  if (achieved && !achievedAt) return '달성일을 확인해 주세요.';
  const paidAt = form.status === 'paid' ? fromDateTimeInputs(form.paidDate, '12:00') : null;
  if (form.status === 'paid' && !paidAt) return '지급일을 확인해 주세요.';
  return { ...sponsor, status: form.status, achieverId: achieved ? form.achieverId : null, achievedAt, paidAt, repeat: false, achievements: [] };
}

/** 사람마다 달성 기록 하나를 고치는 폼 */
interface AchievementForm {
  memberId: string;
  /** YYYY-MM-DD */
  achievedDate: string;
  paid: boolean;
  paidDate: string;
}

/** 멤버 선택 (활성 멤버 먼저, 비활성은 표시를 붙여서) */
function MemberSelect({
  value,
  onChange,
  members,
  placeholder,
  ariaLabel,
  extra,
}: {
  value: string;
  onChange: (id: string) => void;
  members: Member[];
  placeholder: string;
  ariaLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className={ui.selectWrap}>
      <select className={[ui.input, ui.select, value ? '' : s.selectEmpty].join(' ')} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
        <option value="">{placeholder}</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.active ? '' : ' (비활성)'}
          </option>
        ))}
        {extra}
      </select>
      <ChevronDown size={16} />
    </div>
  );
}

/** 카드 아래 바로가기: 진행 중 → 달성 처리, 달성(지급 대기) → 지급 완료 처리 */
const QUICK_ACTION: Partial<Record<SponsorStatus, { next: SponsorStatus; label: string }>> = {
  open: { next: 'achieved', label: '달성 처리' },
  achieved: { next: 'paid', label: '지급 완료 처리' },
};

/** 후원 한 건. 카드를 누르면 수정, 아래 버튼은 다음 상태가 미리 골라진 수정 창 */
function SponsorRow({
  sponsor,
  onOpen,
  onAchievement,
  canAchieve,
}: {
  sponsor: Sponsor;
  onOpen: (status?: SponsorStatus) => void;
  /** 사람마다 달성: 기록 하나(순서) 또는 새 달성 */
  onAchievement: (index: number | 'new') => void;
  /** 사람마다 달성: 아직 달성하지 않은 멤버가 있는지 */
  canAchieve: boolean;
}) {
  const memberMap = useMemberMap();
  const quick = sponsor.repeat ? (canAchieve ? { next: 'achieved' as SponsorStatus, label: '달성 처리' } : undefined) : QUICK_ACTION[sponsor.status];
  return (
    <div className={s.row}>
      <button type="button" className={s.rowMain} onClick={() => onOpen()}>
        <span className={s.rowHead}>
          <span className={s.rowTitle}>{sponsor.title}</span>
          {sponsor.repeat && <span className={[s.chip, s.chipPaid].join(' ')}>사람마다</span>}
          <SponsorStatusChip status={sponsor.status} />
        </span>
        {sponsor.condition && <span className={s.rowCondition}>{sponsor.condition}</span>}
        <span className={s.rowMeta}>
          <Gift size={14} aria-hidden="true" />
          <span>
            {sponsor.prize} <span className={s.rowMetaMuted}>· 후원자 {sponsorDisplayName(sponsor, memberMap)}</span>
          </span>
        </span>
        {!sponsor.repeat && sponsor.status !== 'open' && (
          <span className={s.rowAchieved}>
            <PartyPopper size={14} aria-hidden="true" />
            <span>
              <b>{memberMap.get(sponsor.achieverId ?? '')?.name ?? '?'}</b>
              {sponsor.achievedAt && ` · ${formatDateShortYear(sponsor.achievedAt)} 달성`}
              {sponsor.status === 'paid' && sponsor.paidAt && ` · ${formatDateShortYear(sponsor.paidAt)} 지급`}
            </span>
            {sponsor.status === 'achieved' && <PayoutChip status={sponsor.status} />}
          </span>
        )}
      </button>
      {sponsor.repeat && sponsor.achievements.length > 0 && (
        <div className={s.achieveList}>
          <div className={s.achieveHead}>
            <PartyPopper size={14} aria-hidden="true" /> 달성 {sponsor.achievements.length}명
          </div>
          {sponsor.achievements.map((a, i) => (
            <button key={a.memberId} type="button" className={s.achieveRow} onClick={() => onAchievement(i)}>
              <b>{memberMap.get(a.memberId)?.name ?? '?'}</b>
              <span className={s.achieveDate}>
                {formatDateShortYear(a.achievedAt)} 달성{a.paidAt && ` · ${formatDateShortYear(a.paidAt)} 지급`}
              </span>
              <PayoutChip status={a.paidAt ? 'paid' : 'achieved'} />
            </button>
          ))}
        </div>
      )}
      {quick && (
        <div className={s.rowActions}>
          <button type="button" className={s.rowAction} onClick={() => (sponsor.repeat ? onAchievement('new') : onOpen(quick.next))}>
            <PartyPopper size={14} aria-hidden="true" />
            {quick.label}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 후원 화면 (/sponsors): 전체 후원을 진행 중 / 달성(지급 대기) / 지급 완료로 나눠 보여 주고,
 * 후원 추가·수정·상태 변경·삭제를 합니다. 홈의 후원 현황 카드에서 들어옵니다.
 */
export function SponsorsPage() {
  const toast = useToast();
  const { status, error, retry, syncing, members, sponsors, addSponsor, updateSponsor, deleteSponsor } = useData();
  const memberMap = useMemberMap();
  const groups = useMemo(() => groupSponsors(sponsors), [sponsors]);
  const memberOptions = useMemo(
    () => [...members].sort((a, b) => Number(b.active) - Number(a.active) || a.createdAt.localeCompare(b.createdAt)),
    [members],
  );

  const [editing, setEditing] = useState<Sponsor | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm('new', memberMap));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 사람마다 달성: 어느 후원의 몇 번째 기록을 고치는지 ('new' 면 새 달성)
  const [achieving, setAchieving] = useState<{ sponsor: Sponsor; index: number | 'new' } | null>(null);
  const [achieveForm, setAchieveForm] = useState<AchievementForm>({ memberId: '', achievedDate: '', paid: false, paidDate: '' });

  // 이 기기에 저장해 둔 데이터를 보여 주는 중이면 서버 데이터가 올 때까지 "후원 없음" 대신 로딩 표시
  const loading = status === 'loading' || (syncing && sponsors.length === 0);

  /** status 를 주면 그 상태가 미리 골라진 채로 엽니다 (달성 처리·지급 완료 처리) */
  const openEditor = (target: Sponsor | 'new', status?: SponsorStatus) => {
    setEditing(target);
    setFormError(null);
    const form = initialForm(target, memberMap);
    setForm(status ? { ...form, status } : form);
  };

  const close = () => !saving && setEditing(null);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    const input = toSponsorInput(form, memberMap, editing === 'new' ? null : editing);
    if (typeof input === 'string') {
      setFormError(input);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await addSponsor(input);
        toast('후원을 추가했어요.');
      } else if (editing) {
        await updateSponsor(editing.id, input);
        toast(editing.status !== input.status ? STATUS_TOAST[input.status] : '후원을 수정했어요.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSponsor(deleteTarget.id);
      toast('후원을 삭제했어요.');
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const openAchievement = (sponsor: Sponsor, index: number | 'new') => {
    const today = toDateInput(new Date());
    const current = index === 'new' ? null : sponsor.achievements[index];
    setAchieving({ sponsor, index });
    setFormError(null);
    setAchieveForm({
      memberId: current?.memberId ?? '',
      achievedDate: current ? toDateInput(new Date(current.achievedAt)) : today,
      paid: !!current?.paidAt,
      paidDate: current?.paidAt ? toDateInput(new Date(current.paidAt)) : today,
    });
  };

  /** 달성 기록 저장 (remove 면 그 기록을 지움) */
  const saveAchievement = async (remove = false) => {
    if (!achieving) return;
    const { sponsor, index } = achieving;
    const list = [...sponsor.achievements];
    let toastText = '달성 기록을 지웠어요.';
    if (remove && index !== 'new') {
      list.splice(index, 1);
    } else {
      if (!achieveForm.memberId) return setFormError('달성한 사람을 골라 주세요.');
      const achievedAt = fromDateTimeInputs(achieveForm.achievedDate, '12:00');
      if (!achievedAt) return setFormError('달성일을 확인해 주세요.');
      const paidAt = achieveForm.paid ? fromDateTimeInputs(achieveForm.paidDate, '12:00') : null;
      if (achieveForm.paid && !paidAt) return setFormError('지급일을 확인해 주세요.');
      const item: SponsorAchievement = { memberId: achieveForm.memberId, achievedAt, paidAt };
      if (index === 'new') list.push(item);
      else list[index] = item;
      const wasPaid = index !== 'new' && !!sponsor.achievements[index].paidAt;
      toastText = index === 'new' ? '달성으로 표시했어요.' : !wasPaid && paidAt ? '상품 지급 완료로 표시했어요.' : '달성 기록을 수정했어요.';
    }
    setSaving(true);
    setFormError(null);
    try {
      await updateSponsor(sponsor.id, { achievements: list });
      toast(toastText);
      setAchieving(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /** 사람마다 달성: 아직 달성하지 않은 멤버 (고치는 중인 기록의 멤버는 포함) */
  const achievableMembers = (sponsor: Sponsor, index: number | 'new') =>
    memberOptions.filter((m) => !sponsor.achievements.some((a, i) => a.memberId === m.id && i !== index));

  // 사람마다 달성으로 바꾸는 건 아직 달성 기록이 없을 때만 (기록이 지워지지 않게)
  const repeatLocked =
    editing !== null && editing !== 'new' && (editing.repeat ? editing.achievements.length > 0 : editing.status !== 'open');

  // 수정할 때는 상태부터 (달성 처리·지급 완료가 가장 흔한 수정), 새로 추가할 때는 내용부터
  const statusFirst = editing !== 'new';
  const statusSection = (
    <div className={s.statusBox}>
      <div className={ui.field}>
        <span className={ui.label}>상태</span>
        <Segmented full value={form.status} onChange={(v) => update({ status: v })} options={STATUS_OPTIONS} ariaLabel="후원 상태" />
      </div>
      {form.status !== 'open' && (
        <div className={s.statusFields}>
          <div className={ui.field}>
            <span className={ui.label}>달성한 사람</span>
            <MemberSelect value={form.achieverId} onChange={(id) => update({ achieverId: id })} members={memberOptions} placeholder="선택" ariaLabel="달성한 사람" />
          </div>
          <label className={ui.field}>
            <span className={ui.label}>달성일</span>
            <input type="date" className={[ui.input, s.dateInput].join(' ')} value={form.achievedDate} onChange={(e) => update({ achievedDate: e.target.value })} />
          </label>
        </div>
      )}
      {form.status === 'paid' && (
        <label className={ui.field}>
          <span className={ui.label}>상품 지급일</span>
          <input type="date" className={[ui.input, s.dateInput].join(' ')} value={form.paidDate} onChange={(e) => update({ paidDate: e.target.value })} />
        </label>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="후원 현황" back />
      <div className={app.page}>
        <div className={pages.filterBar}>
          <span className={pages.filterHint}>
            진행 중 {groups.open.length}개 · 전체 {sponsors.length}개
          </span>
          <Button variant="outline" size="sm" icon={<Plus size={16} />} onClick={() => openEditor('new')} disabled={status !== 'ready'}>
            후원 추가
          </Button>
        </div>

        {loading && <SkeletonRows rows={3} height={96} />}
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}
        {!loading && status === 'ready' && sponsors.length === 0 && (
          <Card>
            <EmptyState
              icon={<Gift size={24} />}
              title="아직 등록된 후원이 없어요"
              description="‘후원 추가’로 조건과 상품을 걸어 보세요."
            />
          </Card>
        )}
        {!loading &&
          status === 'ready' &&
          GROUPS.map(({ status: key, label }) =>
            groups[key].length === 0 ? null : (
              <section key={key} className={s.group}>
                <h2 className={s.groupHead}>
                  {label} <b>{groups[key].length}</b>
                </h2>
                {groups[key].map((sp) => (
                  <SponsorRow
                    key={sp.id}
                    sponsor={sp}
                    onOpen={(next) => openEditor(sp, next)}
                    onAchievement={(index) => openAchievement(sp, index)}
                    canAchieve={achievableMembers(sp, 'new').some((m) => m.active)}
                  />
                ))}
              </section>
            ),
          )}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? '후원 추가' : '후원 수정'}
        actions={
          <>
            <Button variant="outline" onClick={close} disabled={saving}>
              취소
            </Button>
            <Button variant="primary" onClick={submit} loading={saving}>
              {editing === 'new' ? '추가' : '저장'}
            </Button>
          </>
        }
      >
        <form
          className={[pages.formStack, s.form].join(' ')}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {statusFirst && !form.repeat && statusSection}
          <label className={ui.field}>
            <span className={ui.label}>제목</span>
            <input className={ui.input} value={form.title} onChange={(e) => update({ title: e.target.value })} maxLength={SPONSOR_TITLE_MAX} placeholder="예: 1호 역만" autoComplete="off" />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>
              달성 조건 <span className={ui.labelOptional}>(선택)</span>
            </span>
            <textarea
              className={[ui.input, ui.textarea].join(' ')}
              value={form.condition}
              onChange={(e) => update({ condition: e.target.value })}
              maxLength={SPONSOR_CONDITION_MAX}
              placeholder="예: 마고모 1호 역만 (카조에 제외)"
              rows={2}
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>상품</span>
            <input className={ui.input} value={form.prize} onChange={(e) => update({ prize: e.target.value })} maxLength={SPONSOR_PRIZE_MAX} placeholder="예: 메가커피 기프티콘" autoComplete="off" />
          </label>
          <div className={ui.field}>
            <span className={ui.label}>후원자</span>
            <MemberSelect
              value={form.sponsorPick}
              onChange={(pick) => update({ sponsorPick: pick })}
              members={memberOptions}
              placeholder="후원자 선택"
              ariaLabel="후원자"
              extra={<option value={CUSTOM_SPONSOR}>직접 입력 (멤버가 아닌 사람)</option>}
            />
            {form.sponsorPick === CUSTOM_SPONSOR && (
              <input
                className={ui.input}
                value={form.sponsorCustom}
                onChange={(e) => update({ sponsorCustom: e.target.value })}
                maxLength={SPONSOR_NAME_MAX}
                placeholder="후원자 이름"
                autoComplete="off"
                aria-label="후원자 이름"
              />
            )}
          </div>
          <button
            type="button"
            className={pages.toggleRow}
            onClick={() => !repeatLocked && update({ repeat: !form.repeat })}
            aria-pressed={form.repeat}
            disabled={repeatLocked}
          >
            <div style={{ textAlign: 'left' }}>
              <strong>사람마다 달성</strong>
              <p>
                {repeatLocked
                  ? '이미 달성한 기록이 있어서 바꿀 수 없어요.'
                  : '각자 한 번씩 달성할 수 있어요. 예: 각자 1호 역만이면 사 주기'}
              </p>
            </div>
            <span className={[pages.switch, form.repeat ? pages.switchOn : ''].join(' ')} aria-hidden="true" />
          </button>
          {!statusFirst && !form.repeat && statusSection}
          {formError && (
            <span className={[ui.help, ui.helpError].join(' ')} role="alert">
              {formError}
            </span>
          )}
          {editing && editing !== 'new' && (
            <button
              type="button"
              className={s.deleteLink}
              onClick={() => {
                setDeleteTarget(editing);
                setEditing(null);
              }}
            >
              <Trash2 size={15} /> 이 후원 삭제
            </button>
          )}
        </form>
      </Modal>

      <Modal
        open={achieving !== null}
        onClose={() => !saving && setAchieving(null)}
        title={achieving ? `${achieving.sponsor.title} · ${achieving.index === 'new' ? '달성 처리' : '달성 기록'}` : ''}
        actions={
          <>
            <Button variant="outline" onClick={() => setAchieving(null)} disabled={saving}>
              취소
            </Button>
            <Button variant="primary" onClick={() => saveAchievement()} loading={saving}>
              저장
            </Button>
          </>
        }
      >
        {achieving && (
          <form
            className={[pages.formStack, s.form].join(' ')}
            onSubmit={(e) => {
              e.preventDefault();
              void saveAchievement();
            }}
          >
            <div className={s.statusFields}>
              <div className={ui.field}>
                <span className={ui.label}>달성한 사람</span>
                <MemberSelect
                  value={achieveForm.memberId}
                  onChange={(id) => setAchieveForm((f) => ({ ...f, memberId: id }))}
                  members={achievableMembers(achieving.sponsor, achieving.index)}
                  placeholder="선택"
                  ariaLabel="달성한 사람"
                />
              </div>
              <label className={ui.field}>
                <span className={ui.label}>달성일</span>
                <input type="date" className={[ui.input, s.dateInput].join(' ')} value={achieveForm.achievedDate} onChange={(e) => setAchieveForm((f) => ({ ...f, achievedDate: e.target.value }))} />
              </label>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>상품</span>
              <Segmented
                full
                value={achieveForm.paid ? 'paid' : 'waiting'}
                onChange={(v) => setAchieveForm((f) => ({ ...f, paid: v === 'paid' }))}
                options={[
                  { value: 'waiting', label: '지급 대기' },
                  { value: 'paid', label: '지급 완료' },
                ]}
                ariaLabel="상품 지급"
              />
            </div>
            {achieveForm.paid && (
              <label className={ui.field}>
                <span className={ui.label}>상품 지급일</span>
                <input type="date" className={[ui.input, s.dateInput].join(' ')} value={achieveForm.paidDate} onChange={(e) => setAchieveForm((f) => ({ ...f, paidDate: e.target.value }))} />
              </label>
            )}
            {formError && (
              <span className={[ui.help, ui.helpError].join(' ')} role="alert">
                {formError}
              </span>
            )}
            {achieving.index !== 'new' && (
              <button type="button" className={s.deleteLink} onClick={() => void saveAchievement(true)} disabled={saving}>
                <Trash2 size={15} /> 이 달성 기록 지우기
              </button>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="후원을 삭제할까요?"
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              취소
            </Button>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              삭제
            </Button>
          </>
        }
      >
        ‘{deleteTarget?.title}’ 후원을 삭제해요. 삭제한 후원은 되돌릴 수 없어요.
      </Modal>
    </>
  );
}
