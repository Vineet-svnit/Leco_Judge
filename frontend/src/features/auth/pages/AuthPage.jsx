import './auth.css';

import { AuthHero } from '../components/AuthHero.jsx';
import { SignInCard } from '../components/SignInCard.jsx';

export default function AuthPage({ error, loginUrl }) {
	return (
		<main className="auth-app">
			<section className="auth-shell">
				<AuthHero />

				<div className="auth-card">
					<SignInCard loginUrl={loginUrl} />

					{error ? <p className="auth-error">{error}</p> : null}
				</div>
			</section>
		</main>
	);
}