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
import { avatarRepoPath } from '../config/images';
import { formatAvgRank } from '../lib/format';
import { computeMemberStats } from '../lib/stats';
import type { Member } from '../lib/types';
import { useData } from '../state/DataProvider';
import ui from '../components/ui.module.css';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

interface FormState {
  name: string;
  avatar: string;
  active: boolean;
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
    setForm(target === 'new' ? { name: '', avatar: '', active: true } : { name: target.name, avatar: target.avatar ?? '', active: target.active });
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
        await addMember({ name, avatar: form.avatar.trim() || null });
        toast('멤버를 추가했어요.');
      } else if (editing) {
        await updateMember(editing.id, { name, avatar: form.avatar.trim() || null, active: form.active });
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
          <label className={ui.field}>
            <span className={ui.label}>
              아바타 파일명 <span className={ui.labelOptional}>(선택)</span>
            </span>
            <input
              className={ui.input}
              value={form.avatar}
              onChange={(e) => setForm({ ...form, avatar: e.target.value })}
              maxLength={100}
              placeholder={editing && editing !== 'new' ? `${editing.id}.png` : '비워두면 <멤버ID>.png'}
              autoComplete="off"
            />
            {editing && editing !== 'new' && (
              <>
                <span className={ui.help}>이미지는 저장소의 아래 경로에 넣어 주세요.</span>
                <span className={s.pathHint}>{avatarRepoPath({ id: editing.id, avatar: form.avatar })}</span>
              </>
            )}
            {editing === 'new' && <span className={ui.help}>멤버를 추가하면 ID 가 생성되고, 수정 화면에서 이미지 경로를 확인할 수 있어요.</span>}
          </label>
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
