import express from 'express';
import { config } from './config.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', network: config.network });
});

app.listen(config.port, () => {
  console.log(`Backend listening on ${config.port}`);
});
