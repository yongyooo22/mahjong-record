import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore, type Store } from './store';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Handler = (req: VercelRequest, res: VercelResponse, store: Store) => Promise<void>;

/** 공통 처리: 저장소 확인, JSON 응답, 오류 변환 */
export function withStore(handler: Handler, resolveStore: () => Store | null = getStore) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    const store = resolveStore();
    if (!store) {
      res.status(503).json({ error: 'Redis 저장소가 설정되지 않았습니다.', code: 'STORAGE_NOT_CONFIGURED' });
      return;
    }
    try {
      await handler(req, res, store);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  };
}

export function parseBody<T = Record<string, unknown>>(req: VercelRequest): T {
  const body = req.body;
  if (body == null) return {} as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new HttpError(400, '잘못된 JSON 본문입니다.');
    }
  }
  return body as T;
}

export function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: `허용되지 않은 메서드입니다. (${allowed.join(', ')})` });
}

export function generateId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}${rand}`;
}
