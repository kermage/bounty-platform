import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createWalletForUser, getWalletForUser } from './wallet.service';

export async function getWallet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const wallet = await getWalletForUser(req.userId!);
    if (!wallet) {
      res.status(404).json({ error: 'No wallet found. POST /api/wallet/generate to create one.' });
      return;
    }
    res.json({ wallet });
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ error: 'Failed to retrieve wallet' });
  }
}

export async function generateWallet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await createWalletForUser(req.userId!);
    if (!result.isNew) {
      res.json({ message: 'Wallet already exists', address: result.address });
      return;
    }

    res.status(201).json({
      message: 'Wallet created successfully',
      address: result.address,
      mnemonic: result.mnemonic,
      warning: 'Save your mnemonic phrase! It will not be shown again.',
    });
  } catch (err) {
    console.error('Generate wallet error:', err);
    res.status(500).json({ error: 'Failed to generate wallet' });
  }
}
