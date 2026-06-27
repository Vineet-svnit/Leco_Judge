export const AuthStateCard = ({ title, description, children }) => {
	return (
		<div className="auth-state">
			<div className="state-header">
				<p className="state-kicker">Authentication</p>
				<h2>{title}</h2>
				<p>{description}</p>
			</div>
			{children}
		</div>
	);
};