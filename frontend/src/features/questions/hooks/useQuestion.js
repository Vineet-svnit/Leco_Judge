import { useEffect, useState } from 'react';

import { questionApi } from '../services/questionService.js';

export const useQuestion = (id) => {
	const [question, setQuestion] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let mounted = true;

		questionApi
			.getById(id)
			.then((data) => {
				if (mounted) {
					setQuestion(data?.question || null);
				}
			})
			.catch(() => {
				if (mounted) {
					setError('Failed to load question.');
				}
			})
			.finally(() => {
				if (mounted) {
					setIsLoading(false);
				}
			});

		return () => {
			mounted = false;
		};
	}, [id]);

	return { question, isLoading, error };
};