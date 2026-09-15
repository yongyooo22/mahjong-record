import { Crown } from 'lucide-react';
import s from './ui.module.css';

/** 1위 표시용 작은 금색 왕관 */
export function CrownMark({ size = 14, className }: { size?: number; className?: string }) {
  return <Crown size={size} className={[s.crown, className ?? ''].join(' ').trim()} aria-label="1위" fill="currentColor" strokeWidth={1.5} />;
}
