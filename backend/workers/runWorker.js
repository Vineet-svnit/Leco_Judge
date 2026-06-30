/**
 * runWorker.js
 *
 * Processes run jobs (no DB record).
 * Runs user code against question.examples only.
 * Results are returned via job return value and awaited by the API synchronously.
 */

import { Worker } from 'bullmq';

import { createRedisConnection } from '../config/redis.js';
import Question from '../models/question.model.js';
import { runInDocker, buildFinalSource, compareOutput } from '../services/dockerJudge.js';

const processRun = async (job) => {
	const { questionId, language, code } = job.data;

	const question = await Question.findById(questionId);
	if (!question) throw new Error(`Question ${questionId} not found`);

	const langSnippet = question.languages.find((l) => l.lang === language);
	if (!langSnippet) throw new Error(`No snippet for language ${language}`);

	const examples = question.examples || [];
	if (examples.length === 0) {
		return { verdict: 'AC', outputs: [], message: 'No examples to run against.' };
	}

	let sourceCode;
	try {
		sourceCode = buildFinalSource(langSnippet.codeSnippet, code);
	} catch (err) {
		return { verdict: 'SYSTEM_ERROR', compilerOutput: err.message };
	}

	console.log(`[runWorker] Running job ${job.id} against ${examples.length} example(s)`);

	const result = await runInDocker({
		sourceCode,
		inputs: examples.map((ex) => ex.input),
		timeLimitMs: question.timeLimit || 2000,
		memoryMb: question.memoryLimit || 256,
	});

	if (result.verdict === 'CE') {
		return { verdict: 'CE', compilerOutput: result.compilerOutput };
	}

	if (result.verdict === 'RE' || result.verdict === 'TLE' || result.verdict === 'MLE') {
		return { verdict: result.verdict, executionTime: result.executionTime };
	}

	// Compare against example expected outputs
	const perExample = examples.map((ex, i) => {
		const actual = result.outputs[i] ?? '';
		const expected = ex.output ?? '';
		const passed = compareOutput(actual, expected, question.comparatorType);
		return { input: ex.input, expectedOutput: expected, actualOutput: actual, passed };
	});

	const allPassed = perExample.every((r) => r.passed);

	console.log(`[runWorker] Job ${job.id} → ${allPassed ? 'AC' : 'WA'}`);

	return {
		verdict: allPassed ? 'AC' : 'WA',
		executionTime: result.executionTime,
		perExample,
	};
};

export const startRunWorker = () => {
	const worker = new Worker('runQueue', processRun, {
		connection: createRedisConnection(),
		concurrency: 1,
	});

	worker.on('completed', (job) => console.log(`[runWorker] Job ${job.id} completed`));
	worker.on('failed', (job, err) => console.error(`[runWorker] Job ${job?.id} failed:`, err.message));
	worker.on('error', (err) => console.error('[runWorker] Worker error:', err.message));

	console.log('[runWorker] Started');
	return worker;
};
