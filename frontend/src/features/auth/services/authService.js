import { AUTH_CONFIG } from '../constants/auth.js';

const buildUrl = (path) => `${AUTH_CONFIG.apiBaseUrl}${path}`;

const requestJson = async (path, options = {}) => {
	const response = await fetch(buildUrl(path), {
		credentials: 'include',
		...options,
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
};

export const authApi = {
	loginUrl: buildUrl('/auth/google'),
	getCurrentUser: () => requestJson('/auth/me'),
	logout: () =>
		fetch(buildUrl('/auth/logout'), {
			method: 'POST',
			credentials: 'include',
		}),
};