import dotenv from 'dotenv';
import { Router } from 'express';
import passport from 'passport';

import {
	getCurrentUser,
	googleSuccess,
	logout,
	makeAdmin,
} from '../controllers/auth.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

dotenv.config();

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
	'/google/callback',
	passport.authenticate('google', {
		session: false,
		failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google`,
	}),
	googleSuccess
);

router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', logout);
router.patch('/users/:id/role', requireAuth, requireAdmin, makeAdmin);

export default router;