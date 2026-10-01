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
import type { Member, NewSponsor, Sponsor, SponsorStatus } from '../lib/types';
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
  status: SponsorStatus;
  achieverId: string;
  /** YYYY-MM-DD */
  achievedDate: string;
  paidDate: string;
}

function initialForm(target: Sponsor | 'new', memberMap: Map<string, Member>): FormState {
  const today = toDateInput(new Date());
  if (target === 'new') {
    return { title: '', condition: '', prize: '', sponsorPick: '', sponsorCustom: '', status: 'open', achieverId: '', achievedDate: today, paidDate: today };
  }
  const isMember = target.sponsorId !== null && memberMap.has(target.sponsorId);
  return {
    title: target.title,
    condition: target.condition,
    prize: target.prize,
    sponsorPick: isMember ? target.sponsorId! : CUSTOM_SPONSOR,
    sponsorCustom: isMember ? '' : target.sponsorName,
    status: target.status,
    achieverId: target.achieverId ?? '',
    achievedDate: target.achievedAt ? toDateInput(new Date(target.achievedAt)) : today,
    paidDate: target.paidAt ? toDateInput(new Date(target.paidAt)) : today,
  };
}

/** 폼 → 저장할 값. 빠진 값이 있으면 안내 문구를 돌려줍니다. 날짜는 그날 정오로 저장합니다. */
function toSponsorInput(form: FormState, memberMap: Map<string, Member>): NewSponsor | string {
  const title = form.title.trim();
  if (!title) return '제목을 입력해 주세요.';
  const prize = form.prize.trim();
  if (!prize) return '상품을 입력해 주세요.';
  const custom = form.sponsorPick === CUSTOM_SPONSOR;
  const sponsorName = custom ? form.sponsorCustom.trim() : (memberMap.get(form.sponsorPick)?.name ?? '');
  if (!sponsorName) return custom ? '후원자 이름을 입력해 주세요.' : '후원자를 골라 주세요.';
  const achieved = form.status !== 'open';
  if (achieved && !form.achieverId) return '달성한 사람을 골라 주세요.';
  const achievedAt = achieved ? fromDateTimeInputs(form.achievedDate, '12:00') : null;
  if (achieved && !achievedAt) return '달성일을 확인해 주세요.';
  const paidAt = form.status === 'paid' ? fromDateTimeInputs(form.paidDate, '12:00') : null;
  if (form.status === 'paid' && !paidAt) return '지급일을 확인해 주세요.';
  return {
    title,
    condition: form.condition.trim(),
    prize,
    sponsorId: custom ? null : form.sponsorPick,
    sponsorName,
    status: form.status,
    achieverId: achieved ? form.achieverId : null,
    achievedAt,
    paidAt,
  };
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
function SponsorRow({ sponsor, onOpen }: { sponsor: Sponsor; onOpen: (status?: SponsorStatus) => void }) {
  const memberMap = useMemberMap();
  const quick = QUICK_ACTION[sponsor.status];
  return (
    <div className={s.row}>
      <button type="button" className={s.rowMain} onClick={() => onOpen()}>
        <span className={s.rowHead}>
          <span className={s.rowTitle}>{sponsor.title}</span>
          <SponsorStatusChip status={sponsor.status} />
        </span>
        {sponsor.condition && <span className={s.rowCondition}>{sponsor.condition}</span>}
        <span className={s.rowMeta}>
          <Gift size={14} aria-hidden="true" />
          <span>
            {sponsor.prize} <span className={s.rowMetaMuted}>· 후원 {sponsorDisplayName(sponsor, memberMap)}</span>
          </span>
        </span>
        {sponsor.status !== 'open' && (
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
      {quick && (
        <div className={s.rowActions}>
          <button type="button" className={s.rowAction} onClick={() => onOpen(quick.next)}>
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
    const input = toSponsorInput(form, memberMap);
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
                  <SponsorRow key={sp.id} sponsor={sp} onOpen={(next) => openEditor(sp, next)} />
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
          {statusFirst && statusSection}
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
          {!statusFirst && statusSection}
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
