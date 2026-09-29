import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redisEnv } from './_lib/store';

/** Redis 저장소 설정 여부를 확인하는 점검용 엔드포인트 (배포 후 브라우저로 열어 확인) */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = redisEnv() !== null;
  res.status(200).json({ ok: configured, storage: configured ? 'redis' : 'none' });
}
