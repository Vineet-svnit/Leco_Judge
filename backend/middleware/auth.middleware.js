import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';

const extractToken = (req) => {
	const bearerToken = req.headers.authorization?.startsWith('Bearer ')
		? req.headers.authorization.split(' ')[1]
		: null;

	return req.cookies?.leco_auth || bearerToken || null;
};

export const requireAuth = async (req, res, next) => {
	try {
		const token = extractToken(req);

		if (!token) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		const payload = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(payload.userId);

		if (!user) {
			return res.status(401).json({ message: 'User not found' });
		}

		req.user = user;
		req.auth = payload;
		return next();
	} catch (error) {
		return res.status(401).json({ message: 'Invalid or expired session' });
	}
};

export const requireAdmin = (req, res, next) => {
	if (req.user?.role !== 'ADMIN') {
		return res.status(403).json({ message: 'Admin access required' });
	}

	return next();
};