import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { db } from '../../db/client';

const googleClient = new OAuth2Client(config.auth.googleClientId);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.auth.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token');
  }
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || '',
    picture: payload.picture || '',
  };
}

export function signJWT(userId: string): string {
  return jwt.sign({ sub: userId }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiry as any,
  });
}

export async function findOrCreateUser(googleUser: GoogleUserInfo) {
  const existing = await db.query('SELECT id, email, google_id FROM users WHERE email = $1', [googleUser.email]);
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await db.query(
    'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING id, email, google_id',
    [googleUser.email, googleUser.id]
  );
  return result.rows[0];
}

export async function handleGoogleSignIn(idToken: string) {
  const googleUser = await verifyGoogleToken(idToken);
  const user = await findOrCreateUser(googleUser);
  const token = signJWT(user.id);
  return { token, user };
}
