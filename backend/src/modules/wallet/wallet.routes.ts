import { Router } from 'express';
import { getWallet, generateWallet } from './wallet.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getWallet);
router.post('/generate', requireAuth, generateWallet);

export default router;
