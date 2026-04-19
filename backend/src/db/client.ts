import { Pool } from 'pg';
import { config } from '../config.js';

export const db = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectDB(): Promise<void> {
  try {
    const client = await db.connect();
    console.log('✅ Database connected');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
}
