import { Request, Response } from 'express';
import { handleGoogleSignIn } from './auth.service';

export async function googleSignIn(req: Request, res: Response): Promise<void> {
  try {
    const { token: idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }

    const { token, user } = await handleGoogleSignIn(idToken);
    res.json({ token, user });
  } catch (err) {
    console.error('Google sign-in error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Logged out successfully' });
}
