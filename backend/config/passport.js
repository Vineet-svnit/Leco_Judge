import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import User from '../models/user.model.js';

dotenv.config();

const upsertGoogleUser = async ({ profile }) => {
	const googleId = profile.id;
	const email = profile.emails?.[0]?.value || '';
	const avatar = profile.photos?.[0]?.value || '';
	const name = profile.displayName || '';

	let user = await User.findOne({ googleId });

	if (!user && email) {
		user = await User.findOne({ email });
	}

	if (user) {
		user.googleId = googleId;
		user.name = name;
		user.email = email;
		user.avatar = avatar;
		await user.save();
		return user;
	}

	const firstUser = !(await User.exists({}));

	return User.create({
		googleId,
		name,
		email,
		avatar,
		role: firstUser ? 'ADMIN' : 'USER',
	});
};

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL:
				process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const user = await upsertGoogleUser({ profile });
				return done(null, user);
			} catch (error) {
				return done(error, false);
			}
		}
	)
);

export default passport;