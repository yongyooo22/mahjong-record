import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { writeSnapshot } from '../lib/storage/snapshot';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import s from './ui.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 화면을 그리는 중 예외가 나도 흰 화면 대신 안내와 복구 버튼을 보여 줍니다.
 * - 다시 시도: 같은 데이터로 다시 그립니다 (일시적인 오류용)
 * - 저장된 데이터 지우고 다시 열기: 이 기기에 저장해 둔 서버 데이터(스냅샷)를 지우고 새로 받습니다
 *   (깨진 스냅샷이 원인일 때). localStorage 저장소 모드의 원본 기록은 지우지 않습니다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 렌더링 오류', error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  private resetAndReload = () => {
    writeSnapshot(null);
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={s.boundary} role="alert">
        <Card>
          <EmptyState
            icon={<AlertTriangle size={26} />}
            title="화면을 그리지 못했어요"
            description={
              <>
                <div>잠시 문제가 생겼어요. 다시 시도해도 같다면 이 기기에 저장된 데이터를 지우고 서버에서 새로 받아 보세요.</div>
                <div className={s.boundaryDetail}>{this.state.error.message}</div>
              </>
            }
            action={
              <div className={s.boundaryActions}>
                <Button variant="primary" size="sm" icon={<RefreshCw size={16} />} onClick={this.retry}>
                  다시 시도
                </Button>
                <Button variant="outline" size="sm" icon={<Trash2 size={16} />} onClick={this.resetAndReload}>
                  저장된 데이터 지우고 다시 열기
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }
}
