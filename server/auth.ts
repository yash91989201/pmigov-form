import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'pmigov-admin';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;
// Keying the session secret off the password invalidates all sessions when it changes.
const sessionKey = createHmac('sha256', 'pmigov-session-v1').update(ADMIN_PASSWORD).digest();

function sign(expiresAt: number): string {
  return createHmac('sha256', sessionKey).update(String(expiresAt)).digest('hex');
}

function makeToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  return `${expiresAt}.${sign(expiresAt)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split('.');
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !sig) return false;
  const expected = sign(expiresAt);
  return (
    sig.length === expected.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
}

function getSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}

export function checkPassword(password: unknown): boolean {
  if (typeof password !== 'string') return false;
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

export function setSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${makeToken()}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax`,
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (verifyToken(getSessionCookie(req))) return next();
  res.status(401).json({ error: 'Admin login required.' });
}
