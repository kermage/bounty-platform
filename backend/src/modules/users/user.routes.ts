import { Router } from 'express';
import { getMe, updateMe } from './user.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);

export default router;
