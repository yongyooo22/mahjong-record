import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff size={26} />}
      title="데이터를 불러오지 못했어요"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw size={16} />}>
          다시 시도
        </Button>
      }
    />
  );
}
