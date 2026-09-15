import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redisEnv } from './_lib/store';

/** 클라이언트가 Redis 저장소 사용 가능 여부를 확인하는 엔드포인트 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = redisEnv() !== null;
  res.status(200).json({ ok: configured, storage: configured ? 'redis' : 'none' });
}
