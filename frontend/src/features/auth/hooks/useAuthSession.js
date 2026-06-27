import { useEffect, useState } from 'react';

import { authApi } from '../services/authService.js';

export const useAuthSession = () => {
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let isMounted = true;

		const loadSession = async () => {
			try {
				const session = await authApi.getCurrentUser();

				if (!isMounted) {
					return;
				}

				setUser(session?.user ?? null);
			} catch {
				if (isMounted) {
					setError('Unable to reach the auth server.');
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		loadSession();

		return () => {
			isMounted = false;
		};
	}, []);

	const logout = async () => {
		try {
			await authApi.logout();
			setUser(null);
			setError('');
		} catch {
			setError('Logout failed. Please try again.');
		}
	};

	return {
		user,
		isLoading,
		error,
		loginUrl: authApi.loginUrl,
		logout,
	};
};