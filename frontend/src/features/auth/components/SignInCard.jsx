import { AuthStateCard } from './AuthStateCard.jsx';

export const SignInCard = ({ loginUrl }) => {
	return (
		<AuthStateCard
			title="Sign in with Google"
			description="The first registered user becomes an admin automatically. Everyone else starts as a regular user."
		>
			<a className="auth-button" href={loginUrl}>
				<span className="google-mark" aria-hidden="true">
					G
				</span>
				Continue with Google
			</a>

			<div className="meta-grid">
				<div>
					<strong>Session</strong>
					<span>HTTP-only cookie</span>
				</div>
				<div>
					<strong>Access</strong>
					<span>Role-based</span>
				</div>
				<div>
					<strong>Defaults</strong>
					<span>User unless first login</span>
				</div>
			</div>
		</AuthStateCard>
	);
};