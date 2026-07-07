/**
 * tcGenWorker.js
 *
 * Generates expected outputs for all testcases of a question by running
 * the official solution through Docker and saving results to MongoDB.
 *
 * Triggered whenever an admin saves/edits testcases.
 */

import { Worker } from 'bullmq';

import { createRedisConnection } from '../config/redis.js';
import Question from '../models/question.model.js';
import TestCase from '../models/testcase.model.js';
import { runInDocker, buildFinalSource } from '../services/dockerJudge.js';

const processTcGen = async (job) => {
	const { questionId } = job.data;

	const question = await Question.findById(questionId);
	if (!question) throw new Error(`Question ${questionId} not found`);

	if (!question.officialSolution) {
		console.warn(`[tcGenWorker] Question ${questionId} has no official solution — skipping`);
		return;
	}

	const langSnippet = question.languages.find((l) => l.lang === 'cpp');
	if (!langSnippet) throw new Error(`No cpp snippet for question ${questionId}`);

	const testcases = await TestCase.find({ questionId }).sort({ createdAt: 1 });
	if (testcases.length === 0) {
		console.log(`[tcGenWorker] No testcases for question ${questionId}`);
		return;
	}

	const sourceCode = buildFinalSource(langSnippet.codeSnippet, question.officialSolution);
	const inputs = testcases.map((tc) => tc.input);

	console.log(`[tcGenWorker] Generating outputs for ${inputs.length} testcase(s) on question ${questionId}`);

	const result = await runInDocker({
		sourceCode,
		inputs,
		timeLimitMs: (question.timeLimit || 2000) * 3, // 3x limit for official solution
		memoryMb: question.memoryLimit || 256,
		collectAllResults: true,
	});

	const testcaseResults = result.testcaseResults?.length
		? result.testcaseResults
		: testcases.map((tc, index) => ({
			index,
			input: tc.input,
			output: result.outputs[index] ?? '',
			status: result.verdict === 'CE' ? 'FAILED' : 'PASSED',
			errorType: result.verdict === 'CE' ? 'CE' : '',
			errorMessage: result.compilerOutput || '',
		}));

	if (result.verdict === 'CE') {
		console.error(`[tcGenWorker] Official solution CE for question ${questionId}:\n${result.compilerOutput}`);
	}

	const updateOps = testcases.map((tc, index) => {
		const testcaseResult = testcaseResults[index] || {};
		const passed = testcaseResult.status === 'PASSED' || (!testcaseResult.status && !testcaseResult.errorType);

		return {
		updateOne: {
			filter: { _id: tc._id },
			update: {
				$set: {
					output: passed ? testcaseResult.output ?? result.outputs[index] ?? '' : '',
					status: passed ? 'PASSED' : 'FAILED',
					errorType: passed ? '' : testcaseResult.errorType || 'RE',
					errorMessage: passed ? '' : testcaseResult.errorMessage || result.compilerOutput || '',
				},
			},
		},
		};
	});

	await TestCase.bulkWrite(updateOps);

	const passedCount = testcaseResults.filter((testcaseResult) => testcaseResult.status === 'PASSED').length;
	const failedCount = testcaseResults.length - passedCount;
	console.log(`[tcGenWorker] Saved outputs for ${passedCount} passing testcase(s) and marked ${failedCount} failed testcase(s) on question ${questionId}`);
};

export const startTcGenWorker = () => {
	const worker = new Worker('tcGenQueue', processTcGen, {
		connection: createRedisConnection(),
		concurrency: 1,
	});

	worker.on('completed', (job) => console.log(`[tcGenWorker] Job ${job.id} completed`));
	worker.on('failed', (job, err) => console.error(`[tcGenWorker] Job ${job?.id} failed:`, err.message));
	worker.on('error', (err) => console.error('[tcGenWorker] Worker error:', err.message));

	console.log('[tcGenWorker] Started');
	return worker;
};
