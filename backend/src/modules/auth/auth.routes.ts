import { Router } from 'express';
import { googleSignIn, logout } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/google', googleSignIn);
router.post('/logout', requireAuth, logout);

export default router;
