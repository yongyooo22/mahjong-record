import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Points } from '../components/Points';
import { RankBadge } from '../components/RankBadge';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { GAME_TYPE_LABEL } from '../config/rules';
import { formatDateTime } from '../lib/format';
import { computeResults, formatPoints, formatScore } from '../lib/scoring';
import { useData, useMemberMap } from '../state/DataProvider';
import app from '../styles/App.module.css';
import s from './Pages.module.css';

export function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { status, games, deleteGame } = useData();
  const memberMap = useMemberMap();
  const game = games.find((g) => g.id === id);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => (game ? computeResults(game.scores, game.rules, game.gameType) : []), [game]);
  const ordered = [...results].sort((a, b) => a.rank - b.rank);

  const onDelete = async () => {
    if (!game) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteGame(game.id);
      toast('기록을 삭제했어요.');
      navigate('/games', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <>
      <PageHeader title="대국 상세" back>
        {game && (
          <div className={s.detailHero}>
            <div className={s.detailTitle}>{game.title || '대국'}</div>
            <div className={s.detailMeta}>
              {formatDateTime(game.playedAt)} · {GAME_TYPE_LABEL[game.gameType]} · {game.playerCount}인
            </div>
          </div>
        )}
      </PageHeader>
      <div className={app.page}>
        {status === 'loading' && <SkeletonRows rows={2} height={160} />}
        {status === 'ready' && !game && (
          <Card>
            <EmptyState icon={<Trash2 size={22} />} title="기록을 찾을 수 없어요" description="이미 삭제되었거나 주소가 잘못되었어요." />
          </Card>
        )}
        {game && (
          <>
            <Card>
              <SectionHeader title="결과" />
              {ordered.map((r) => {
                const member = memberMap.get(game.playerIds[r.index]);
                return (
                  <div key={r.index} className={s.detailRow}>
                    <RankBadge rank={r.rank} />
                    {member && <Avatar member={member} size={36} />}
                    <span className={s.detailName}>{member?.name ?? '(삭제된 멤버)'}</span>
                    <div className={s.detailScore}>
                      <strong>{formatScore(r.score)}</strong>
                      <small>우마 {formatPoints(r.uma)}</small>
                    </div>
                    <Points value={r.points} className={s.detailPoints} />
                  </div>
                );
              })}
            </Card>

            {game.memo && (
              <Card>
                <SectionHeader title="오늘의 한마디" />
                <div className={s.memo} style={{ marginTop: 0 }}>
                  {game.memo}
                </div>
              </Card>
            )}

            <Card>
              <SectionHeader title="적용된 정산 규칙" />
              <div className={s.kv}>
                <span>시작 / 반환 점수</span>
                <strong>
                  {formatScore(game.rules.startPoints)} / {formatScore(game.rules.returnPoints)}
                </strong>
              </div>
              <div className={s.kv}>
                <span>우마</span>
                <strong>{game.rules.uma.map((u) => formatPoints(u)).join(' / ')}</strong>
              </div>
              {game.gameType === 'tonpuu' && (
                <div className={s.kv}>
                  <span>동풍전 우마 배율</span>
                  <strong>×{game.rules.tonpuuUmaMultiplier}</strong>
                </div>
              )}
              <div className={s.kv}>
                <span>점수 합계</span>
                <strong>{formatScore(game.scores.reduce((a, b) => a + b, 0))}</strong>
              </div>
            </Card>

            {error && (
              <Card tight>
                <span className="neg">{error}</span>
              </Card>
            )}

            <div className={s.dangerZone}>
              <Button variant="red" size="sm" icon={<Trash2 size={16} />} onClick={() => setConfirm(true)}>
                이 기록 삭제
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={confirm}
        onClose={() => !deleting && setConfirm(false)}
        title="기록을 삭제할까요?"
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={deleting}>
              취소
            </Button>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              삭제
            </Button>
          </>
        }
      >
        삭제한 기록은 되돌릴 수 없어요. 통계와 랭킹에서도 바로 제외됩니다.
      </Modal>
    </>
  );
}
