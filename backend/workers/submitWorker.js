import { Worker } from 'bullmq';

import { createRedisConnection } from '../config/redis.js';
import Submission from '../models/submission.model.js';
import Question from '../models/question.model.js';

const processSubmit = async (job) => {
	const { submissionId } = job.data;

	// Load submission and question from DB
	const submission = await Submission.findById(submissionId);
	if (!submission) {
		throw new Error(`Submission ${submissionId} not found`);
	}

	const question = await Question.findById(submission.questionId);
	if (!question) {
		throw new Error(`Question ${submission.questionId} not found`);
	}

	// Mark as RUNNING
	submission.status = 'RUNNING';
	submission.startedAt = new Date();
	await submission.save();

	console.log(`[submitWorker] Processing submission ${submissionId} for question ${question._id}`);

	// TODO: Docker compilation + execution against hidden testcases
	// Placeholder — actual judge execution goes here

	console.log(`[submitWorker] Done with ${submissionId} (judge not yet connected)`);
};

export const startSubmitWorker = () => {
	const worker = new Worker('submitQueue', processSubmit, {
		connection: createRedisConnection(),
		concurrency: 1,
	});

	worker.on('completed', (job) => {
		console.log(`[submitWorker] Job ${job.id} completed`);
	});

	worker.on('failed', (job, err) => {
		console.error(`[submitWorker] Job ${job?.id} failed:`, err.message);
	});

	worker.on('error', (err) => {
		console.error('[submitWorker] Worker error:', err.message);
	});

	console.log('[submitWorker] Started');
	return worker;
};
