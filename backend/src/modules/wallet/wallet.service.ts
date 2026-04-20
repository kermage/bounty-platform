import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';
import { config } from '../../config';
import { db } from '../../db/client';
import crypto from 'crypto';

const provider = new BlockfrostProvider(config.blockchain.blockfrostApiKey);

function encryptMnemonic(mnemonic: string, userId: string): string {
  const key = crypto.scryptSync(config.auth.jwtSecret + userId, 'bounty-platform-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptMnemonic(encryptedData: string, userId: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const key = crypto.scryptSync(config.auth.jwtSecret + userId, 'bounty-platform-salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function createWalletForUser(userId: string) {
  const existing = await db.query('SELECT id, cardano_address FROM wallets WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) {
    return { address: existing.rows[0].cardano_address, isNew: false };
  }

  const mnemonic = MeshWallet.brew() as string[];
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: 'mnemonic', words: mnemonic },
  });

  const address = wallet.getChangeAddress();
  const encryptedMnemonic = encryptMnemonic(mnemonic.join(' '), userId);

  await db.query(
    'INSERT INTO wallets (user_id, cardano_address, encrypted_mnemonic) VALUES ($1, $2, $3)',
    [userId, address, encryptedMnemonic]
  );

  return { address, mnemonic, isNew: true };
}

export async function getWalletForUser(userId: string) {
  const result = await db.query('SELECT id, cardano_address, created_at FROM wallets WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function getWalletWithDecryptedMnemonic(userId: string) {
  const result = await db.query('SELECT id, cardano_address, encrypted_mnemonic FROM wallets WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return null;

  const wallet = result.rows[0];
  const mnemonic = decryptMnemonic(wallet.encrypted_mnemonic, userId);
  return { id: wallet.id, address: wallet.cardano_address, mnemonic };
}
