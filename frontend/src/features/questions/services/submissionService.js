import { AUTH_CONFIG } from '../../auth/constants/auth.js';

const buildUrl = (path) => `${AUTH_CONFIG.apiBaseUrl}${path}`;

const requestJson = async (path, options = {}) => {
	const response = await fetch(buildUrl(path), {
		credentials: 'include',
		...options,
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(payload?.message || 'Request failed');
	}

	return response.json();
};

export const submissionApi = {
	// Save submission to DB and queue for judging
	submit: (questionId, language, code) =>
		requestJson('/submissions/submit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ questionId, language, code }),
		}),

	// Run against examples only — no DB write (judge not yet connected)
	run: (questionId, language, code) =>
		requestJson('/submissions/run', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ questionId, language, code }),
		}),

	// Poll submission status by ID
	getStatus: (submissionId) => requestJson(`/submissions/${submissionId}`),

	// Fetch submission history for a question
	getHistory: (questionId) => requestJson(`/submissions?questionId=${questionId}`),
};
