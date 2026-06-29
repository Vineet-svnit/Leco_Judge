import { Worker } from 'bullmq';

import { createRedisConnection } from '../config/redis.js';
import Question from '../models/question.model.js';

const processRun = async (job) => {
	const { questionId, language, code } = job.data;

	// Load question from DB to get code template and example testcases
	const question = await Question.findById(questionId);
	if (!question) {
		throw new Error(`Question ${questionId} not found`);
	}

	const langSnippet = question.languages.find((l) => l.lang === language);
	if (!langSnippet) {
		throw new Error(`No snippet found for language ${language}`);
	}

	console.log(`[runWorker] Processing run job ${job.id} for question ${questionId}`);
	console.log(`[runWorker] Examples to run against: ${question.examples?.length || 0}`);

	// TODO: Docker compilation + execution against question.examples
	// Final source = langSnippet.codeSnippet with LECO_USER_CODE replaced by `code`
	// Placeholder — actual judge execution goes here

	console.log(`[runWorker] Done with job ${job.id} (judge not yet connected)`);
};

export const startRunWorker = () => {
	const worker = new Worker('runQueue', processRun, {
		connection: createRedisConnection(),
		concurrency: 1, // run jobs are lighter, allow higher concurrency
	});

	worker.on('completed', (job) => {
		console.log(`[runWorker] Job ${job.id} completed`);
	});

	worker.on('failed', (job, err) => {
		console.error(`[runWorker] Job ${job?.id} failed:`, err.message);
	});

	worker.on('error', (err) => {
		console.error('[runWorker] Worker error:', err.message);
	});

	console.log('[runWorker] Started');
	return worker;
};
