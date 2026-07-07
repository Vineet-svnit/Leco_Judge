import { AUTH_CONFIG } from '../../auth/constants/auth.js';

const buildUrl = (path) => `${AUTH_CONFIG.apiBaseUrl}${path}`;

const requestJson = async (path, options = {}) => {
	const response = await fetch(buildUrl(path), {
		credentials: 'include',
		...options,
	});

	if (!response.ok) {
		throw new Error('Request failed');
	}

	return response.json();
};

export const questionApi = {
	list: () => requestJson('/questions'),
	getById: (id) => requestJson(`/questions/${id}`),
	create: (payload) =>
		requestJson('/admin/questions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}),
	update: (id, payload) =>
		requestJson(`/admin/questions/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}),
	listTestcases: (questionId) => requestJson(`/admin/questions/${questionId}/testcases`),
	batchSaveTestcases: (questionId, testcases) =>
		requestJson(`/admin/questions/${questionId}/testcases/batch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ testcases }),
		}),

	// AI — two calls total
	aiDiscoverFamilies: (payload) =>
		requestJson('/admin/ai/discover-families', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}),
	aiGenerateGenerator: (payload) =>
		requestJson('/admin/ai/generate-generator', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}),

	// Generator execution in Docker (no AI)
	generatorRun: (generatorCode, families) =>
		requestJson('/admin/generator/run', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ generatorCode, families }),
		}),
};