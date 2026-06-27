import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';

const getAuthCookieOptions = () => ({
	httpOnly: true,
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production',
	path: '/',
	maxAge: 1000 * 60 * 60 * 24 * 7,
});

const signAuthToken = (user) =>
	jwt.sign(
		{
			userId: user._id.toString(),
			role: user.role,
		},
		process.env.JWT_SECRET,
		{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
	);

export const googleSuccess = (req, res) => {
	if (!req.user) {
		return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google`);
	}

	const token = signAuthToken(req.user);
	res.cookie('leco_auth', token, getAuthCookieOptions());

	return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
};

export const getCurrentUser = async (req, res) => {
	return res.json({ user: req.user });
};

export const logout = (req, res) => {
	res.clearCookie('leco_auth', { path: '/' });
	return res.json({ message: 'Logged out successfully' });
};

export const makeAdmin = async (req, res) => {
	const { role } = req.body;

	if (role && role !== 'ADMIN') {
		return res.status(400).json({ message: 'Only admin promotion is allowed here' });
	}

	const targetUser = await User.findById(req.params.id);

	if (!targetUser) {
		return res.status(404).json({ message: 'User not found' });
	}

	if (targetUser.role === 'ADMIN') {
		return res.status(200).json({ message: 'User is already an admin', user: targetUser });
	}

	targetUser.role = 'ADMIN';
	await targetUser.save();

	return res.json({ message: 'User promoted to admin', user: targetUser });
};