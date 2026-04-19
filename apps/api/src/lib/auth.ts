import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export interface TokenPayload {
  userId: string;
  role: string;
  sessionId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
}

export function signRefreshToken(payload: Pick<TokenPayload, 'userId' | 'sessionId'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL, algorithm: 'HS256' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): Pick<TokenPayload, 'userId' | 'sessionId'> {
  return jwt.verify(token, JWT_REFRESH_SECRET) as Pick<TokenPayload, 'userId' | 'sessionId'>;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
