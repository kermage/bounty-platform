import { Router } from 'express';
import { getWallet, generateWallet } from './wallet.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, getWallet);
router.post('/generate', requireAuth, generateWallet);

export default router;
