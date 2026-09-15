import { Pencil, Plus, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { AVATAR_OPTIONS, avatarFile } from '../config/images';
import { formatAvgRank } from '../lib/format';
import { computeMemberStats } from '../lib/stats';
import type { Member } from '../lib/types';
import { useData } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

interface FormState {
  name: string;
  /** 고른 아바타 파일명. '' 이면 아바타 없음 */
  avatar: string;
  active: boolean;
}

const optionFiles = new Set(AVATAR_OPTIONS.map((o) => o.file));

/** 멤버가 실제로 쓰는 아바타가 선택 목록에 있으면 그 파일명, 없으면 '' */
function initialAvatar(member: Member): string {
  const file = avatarFile(member);
  return optionFiles.has(file) ? file : '';
}

/** 아바타 선택 격자 */
function AvatarPicker({ value, onChange, members, editingId }: { value: string; onChange: (file: string) => void; members: Member[]; editingId: string | null }) {
  // 다른 멤버가 이미 쓰고 있는 이미지 → 이름을 작게 표시 (고를 수는 있음)
  const usedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.id === editingId) continue;
      const file = avatarFile(m);
      if (optionFiles.has(file) && !map.has(file)) map.set(file, m.name);
    }
    return map;
  }, [members, editingId]);

  // 기존 멤버가 <id>.png 를 기본으로 쓰고 있으면 "없음" 을 골라도 그 이미지가 유지되므로 없음 옵션을 숨깁니다.
  const showNone = !editingId || !optionFiles.has(`${editingId}.png`);

  if (AVATAR_OPTIONS.length === 0) {
    return <span className={ui.help}>사용할 수 있는 아바타 이미지가 아직 없어요.</span>;
  }

  return (
    <div className={s.avatarGrid} role="radiogroup" aria-label="아바타 선택">
      {showNone && (
        <button type="button" role="radio" aria-checked={value === ''} className={[s.avatarOpt, value === '' ? s.avatarOptActive : ''].join(' ')} onClick={() => onChange('')}>
          <span className={s.avatarOptNone}>
            <UserRound size={22} />
          </span>
          <span className={s.avatarOptLabel}>없음</span>
        </button>
      )}
      {AVATAR_OPTIONS.map((o) => {
        const active = value === o.file;
        const owner = usedBy.get(o.file);
        return (
          <button
            key={o.file}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={owner ? `아바타 (${owner} 사용 중)` : '아바타'}
            className={[s.avatarOpt, active ? s.avatarOptActive : ''].join(' ')}
            onClick={() => onChange(o.file)}
          >
            <img src={o.url} alt="" className={s.avatarOptImg} loading="lazy" decoding="async" />
            <span className={[s.avatarOptLabel, owner ? s.avatarOptInUse : ''].join(' ')}>{owner ?? ''}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MembersPage() {
  const toast = useToast();
  const { status, error, retry, members, games, addMember, updateMember } = useData();
  const stats = useMemo(() => computeMemberStats(games), [games]);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', avatar: '', active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const open = (target: Member | 'new') => {
    setEditing(target);
    setFormError(null);
    setForm(target === 'new' ? { name: '', avatar: '', active: true } : { name: target.name, avatar: initialAvatar(target), active: target.active });
  };

  const close = () => !saving && setEditing(null);

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('이름을 입력해 주세요.');
      return;
    }
    if (members.some((m) => m.name === name && (editing === 'new' || m.id !== editing?.id))) {
      setFormError('같은 이름의 멤버가 이미 있어요.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await addMember({ name, avatar: form.avatar || null });
        toast('멤버를 추가했어요.');
      } else if (editing) {
        await updateMember(editing.id, { name, avatar: form.avatar || null, active: form.active });
        toast('멤버 정보를 수정했어요.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const sorted = useMemo(
    () => [...members].sort((a, b) => Number(b.active) - Number(a.active) || a.createdAt.localeCompare(b.createdAt)),
    [members],
  );

  const editingHasGames = editing && editing !== 'new' ? (stats.get(editing.id)?.games ?? 0) > 0 : false;

  return (
    <>
      <PageHeader title="멤버" />
      <div className={app.page}>
        <div className={s.filterBar}>
          <span className={s.filterHint}>활성 {members.filter((m) => m.active).length}명 · 전체 {members.length}명</span>
          <Button variant="outline" size="sm" icon={<Plus size={16} />} onClick={() => open('new')} disabled={status !== 'ready'}>
            멤버 추가
          </Button>
        </div>

        {status === 'loading' && <SkeletonRows rows={4} height={70} />}
        {status === 'error' && (
          <Card>
            <ErrorState message={error ?? ''} onRetry={retry} />
          </Card>
        )}
        {status === 'ready' && sorted.length === 0 && (
          <Card>
            <EmptyState icon={<UserRound size={24} />} title="멤버가 없어요" description="함께 치는 친구들을 추가해 주세요." />
          </Card>
        )}
        {status === 'ready' && sorted.length > 0 && (
          <div className={s.list}>
            {sorted.map((m) => {
              const st = stats.get(m.id);
              return (
                <Card key={m.id} className={[s.memberRow, m.active ? '' : s.memberRowInactive].join(' ')} tight>
                  <Avatar member={m} size={44} />
                  <div className={s.memberBody}>
                    <div className={s.memberName}>
                      {m.name}
                      {!m.active && <span className={s.inactiveTag}>비활성</span>}
                    </div>
                    <div className={s.memberStats}>
                      <span>
                        <b>{st?.games ?? 0}</b>국
                      </span>
                      <span>
                        평균 <b>{formatAvgRank(st?.avgRank ?? null)}</b>위
                      </span>
                      <span>
                        누적 <Points value={st?.totalPoints ?? 0} />
                      </span>
                    </div>
                  </div>
                  <button type="button" className={s.editBtn} onClick={() => open(m)} aria-label={`${m.name} 수정`}>
                    <Pencil size={18} />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? '멤버 추가' : '멤버 수정'}
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
          className={s.formStack}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className={ui.field}>
            <span className={ui.label}>이름</span>
            <input className={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={20} placeholder="예: 연경" autoFocus autoComplete="off" />
          </label>
          <div className={ui.field}>
            <span className={ui.label}>
              캐릭터 <span className={ui.labelOptional}>(선택)</span>
            </span>
            <AvatarPicker value={form.avatar} onChange={(file) => setForm({ ...form, avatar: file })} members={members} editingId={editing && editing !== 'new' ? editing.id : null} />
          </div>
          {editing && editing !== 'new' && (
            <button type="button" className={s.toggleRow} onClick={() => setForm({ ...form, active: !form.active })} aria-pressed={form.active}>
              <div style={{ textAlign: 'left' }}>
                <strong>활성 멤버</strong>
                <p>{editingHasGames ? '대국 기록이 있어 삭제 대신 비활성 처리할 수 있어요.' : '비활성 멤버는 참가자 선택에서 숨겨져요.'}</p>
              </div>
              <span className={[s.switch, form.active ? s.switchOn : ''].join(' ')} aria-hidden="true" />
            </button>
          )}
          {formError && (
            <span className={[ui.help, ui.helpError].join(' ')} role="alert">
              {formError}
            </span>
          )}
        </form>
      </Modal>
    </>
  );
}
