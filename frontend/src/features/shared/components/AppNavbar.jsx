import { Link } from 'react-router-dom';

export const AppNavbar = ({ user, onLogout }) => {
	return (
		<nav className="app-navbar">
			<div className="app-navbar__brand">
				<Link to="/" className="app-navbar__logo">
					Leco Judge
				</Link>
				<span className="app-navbar__subtitle">Practice and judge platform</span>
			</div>

			<div className="app-navbar__actions">
				<span className="status-chip status-chip--nav">{user.role}</span>
				{user.role === 'ADMIN' ? (
					<Link to="/admin" className="page-button page-button--secondary">
						Admin dashboard
					</Link>
				) : null}
				<button type="button" className="page-button page-button--ghost" onClick={onLogout}>
					Logout
				</button>
			</div>
		</nav>
	);
};