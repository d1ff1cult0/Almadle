import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const MAX_ATTEMPTS = 6;
const COOKIE_NAME = 'almadle_game';
const COOKIE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type GameState = 'playing' | 'won' | 'lost';

export type GameSession = {
  v: 1;
  targetId: number;
  attempts: number;
  state: GameState;
  createdAt: number;
};

function secret() {
  return process.env.ALMADLE_SECRET ?? 'dev-only-secret-change-me';
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(session: GameSession) {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function decode(value: string): GameSession | null {
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  // timing-safe compare
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as GameSession;
    if (parsed?.v !== 1) return null;
    if (!Number.isFinite(parsed.targetId)) return null;
    if (!Number.isFinite(parsed.attempts)) return null;
    if (!Number.isFinite(parsed.createdAt)) return null;
    if (parsed.state !== 'playing' && parsed.state !== 'won' && parsed.state !== 'lost') return null;
    if (Date.now() - parsed.createdAt > COOKIE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<GameSession | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME)?.value;
  if (!c) return null;
  return decode(c);
}

export async function setSession(session: GameSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}


