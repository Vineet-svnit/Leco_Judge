import './auth.css';

import { AuthHero } from '../components/AuthHero.jsx';
import { SignInCard } from '../components/SignInCard.jsx';
import { SignedInCard } from '../components/SignedInCard.jsx';
import { useAuthSession } from '../hooks/useAuthSession.js';

export default function AuthPage() {
	const { user, isLoading, error, loginUrl, logout } = useAuthSession();

	return (
		<main className="auth-app">
			<section className="auth-shell">
				<AuthHero />

				<div className="auth-card">
					{isLoading ? (
						<div className="auth-state">
							<div className="spinner" aria-hidden="true" />
							<h2>Checking session</h2>
							<p>Loading your account...</p>
						</div>
					) : user ? (
						<SignedInCard user={user} onLogout={logout} />
					) : (
						<SignInCard loginUrl={loginUrl} />
					)}

					{error ? <p className="auth-error">{error}</p> : null}
				</div>
			</section>
		</main>
	);
}