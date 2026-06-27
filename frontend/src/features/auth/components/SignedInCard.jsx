import { AuthStateCard } from './AuthStateCard.jsx';

const getInitials = (value) => {
	return value
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() || '')
		.join('');
};

export const SignedInCard = ({ user, onLogout }) => {
	const initials = getInitials(user?.name || user?.email || 'User');
	const roleClass = user.role === 'ADMIN' ? 'admin' : 'user';

	return (
		<AuthStateCard
			title={user.name || 'Unnamed user'}
			description={user.email || 'No email available'}
		>
			<div className="signed-in">
				<div className="profile-head">
					<div className="avatar" aria-hidden="true">
						{initials}
					</div>
					<div>
						<p className="state-kicker">Signed in</p>
						<h2>{user.name || 'Unnamed user'}</h2>
						<p>{user.email || 'No email available'}</p>
					</div>
				</div>

				<div className="role-row">
					<span className={`role-pill ${roleClass}`}>{user.role}</span>
					<span className="role-note">
						{user.role === 'ADMIN'
							? 'You can manage users and auth-level admin flows.'
							: 'You are signed in as a standard user.'}
					</span>
				</div>

				{user.avatar ? (
					<img className="profile-avatar" src={user.avatar} alt="Google profile avatar" />
				) : null}

				<div className="actions-row">
					<button type="button" className="secondary-button" onClick={onLogout}>
						Logout
					</button>
				</div>
			</div>
		</AuthStateCard>
	);
};