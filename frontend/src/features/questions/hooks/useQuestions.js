import { useEffect, useState } from 'react';

import { questionApi } from '../services/questionService.js';

export const useQuestions = () => {
	const [questions, setQuestions] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let mounted = true;

		questionApi
			.list()
			.then((data) => {
				if (mounted) {
					setQuestions(data?.questions || []);
				}
			})
			.catch(() => {
				if (mounted) {
					setError('Failed to load questions.');
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
	}, []);

	return { questions, isLoading, error };
};