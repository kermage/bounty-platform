import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { db } from '../../db/client';

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query('SELECT id, email, google_id, created_at FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
}

export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const result = await db.query(
      'UPDATE users SET email = COALESCE($1, email), updated_at = NOW() WHERE id = $2 RETURNING id, email, google_id, updated_at',
      [email, req.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}
