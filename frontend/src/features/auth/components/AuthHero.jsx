import { AUTH_CONFIG } from '../constants/auth.js';

const highlights = [
	{
		title: 'Google login',
		description: 'One-click sign in for all users.',
	},
	{
		title: 'Role-aware access',
		description: 'Admins can manage users and content.',
	},
	{
		title: 'Scalable foundation',
		description: 'Ready for queue-backed execution.',
	},
];

export const AuthHero = () => {
	return (
		<div className="auth-hero">
			<p className="eyebrow">{AUTH_CONFIG.clientTitle}</p>
			<h1>Judge. Learn. Repeat.</h1>
			<p className="lede">
				A focused coding platform built around scalable judging, clean auth, and a minimal user
				experience.
			</p>
			<div className="hero-points">
				{highlights.map((item) => (
					<div key={item.title}>
						<strong>{item.title}</strong>
						<span>{item.description}</span>
					</div>
				))}
			</div>
		</div>
	);
};