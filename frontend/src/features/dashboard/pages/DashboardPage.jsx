import { Link, Navigate } from 'react-router-dom';

import { AppNavbar } from '../../shared/components/AppNavbar.jsx';
import { useQuestions } from '../../questions/hooks/useQuestions.js';
import { QuestionList } from '../../questions/components/QuestionList.jsx';

export default function DashboardPage({ user, logout }) {
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <DashboardContent user={user} logout={logout} />;
}


function DashboardContent({ user, logout }) {
	const { questions, isLoading, error } = useQuestions();

	return (
		<main className="page-shell">
			<AppNavbar user={user} onLogout={logout} />
			<header className="page-header page-header--split">
				<div className="page-header__copy">
					<p className="page-kicker">Leco Judge</p>
					<h1>Problem set</h1>
					<p className="page-lead">
						Browse the active problem bank. Clicking any problem opens the details page and the
						editor/admin flow stays role-aware in the same session.
					</p>
				</div>
				<div className="page-header__actions">
					<span className="status-chip">Signed in as {user.role}</span>
					{user.role === 'ADMIN' ? (
						<Link to="/admin" className="page-button page-button--primary">
							Admin dashboard
						</Link>
					) : null}
				</div>
			</header>

			<section className="page-panel">
				{isLoading ? <p className="empty-state">Loading questions...</p> : null}
				{error ? <p className="empty-state empty-state--error">{error}</p> : null}
			{!isLoading && !error ? <QuestionList questions={questions} /> : null}
			</section>
		</main>
	);
}