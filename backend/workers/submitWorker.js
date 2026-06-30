/**
 * submitWorker.js
 *
 * Processes official submissions synchronously:
 *   load → compile → run all testcases → compare → save verdict → return
 *
 * Status field updates are intentionally omitted per current design.
 */

import { Worker } from 'bullmq';

import { createRedisConnection } from '../config/redis.js';
import Submission from '../models/submission.model.js';
import Question from '../models/question.model.js';
import TestCase from '../models/testcase.model.js';
import { runInDocker, buildFinalSource, compareOutput } from '../services/dockerJudge.js';

const processSubmit = async (job) => {
	const { submissionId } = job.data;

	const submission = await Submission.findById(submissionId);
	if (!submission) throw new Error(`Submission ${submissionId} not found`);

	const question = await Question.findById(submission.questionId);
	if (!question) throw new Error(`Question ${submission.questionId} not found`);

	const langSnippet = question.languages.find((l) => l.lang === submission.language);
	if (!langSnippet) throw new Error(`No snippet for language ${submission.language}`);

	const testcases = await TestCase.find({ questionId: question._id }).sort({ createdAt: 1 });
	if (testcases.length === 0) {
		console.warn(`[submitWorker] No testcases for question ${question._id} — marking SYSTEM_ERROR`);
		await Submission.findByIdAndUpdate(submissionId, {
			verdict: 'SYSTEM_ERROR',
			compilerOutput: 'No testcases found for this question.',
			completedAt: new Date(),
		});
		return { verdict: 'SYSTEM_ERROR' };
	}

	// Build final compilable source
	let sourceCode;
	try {
		sourceCode = buildFinalSource(langSnippet.codeSnippet, submission.code);
	} catch (err) {
		await Submission.findByIdAndUpdate(submissionId, {
			verdict: 'SYSTEM_ERROR',
			compilerOutput: err.message,
			completedAt: new Date(),
		});
		return { verdict: 'SYSTEM_ERROR' };
	}

	console.log(`[submitWorker] Judging submission ${submissionId} against ${testcases.length} testcase(s)`);

	const result = await runInDocker({
		sourceCode,
		inputs: testcases.map((tc) => tc.input),
		timeLimitMs: question.timeLimit || 2000,
		memoryMb: question.memoryLimit || 256,
	});

	// CE — no further comparison needed
	if (result.verdict === 'CE') {
		await Submission.findByIdAndUpdate(submissionId, {
			verdict: 'CE',
			compilerOutput: result.compilerOutput,
			completedAt: new Date(),
		});
		return { verdict: 'CE', compilerOutput: result.compilerOutput };
	}

	// RE / TLE / MLE already set by runInDocker
	if (result.verdict === 'RE' || result.verdict === 'TLE' || result.verdict === 'MLE') {
		const update = {
			verdict: result.verdict,
			executionTime: result.executionTime,
			completedAt: new Date(),
		};
		if (result.firstFailedTestCase) {
			update.firstFailedTestCase = {
				input: testcases[result.firstFailedTestCase.index]?.input,
			};
		}
		await Submission.findByIdAndUpdate(submissionId, update);
		return { verdict: result.verdict, executionTime: result.executionTime };
	}

	// Compare outputs
	let finalVerdict = 'AC';
	let firstFailedTestCase = null;

	for (let i = 0; i < testcases.length; i++) {
		const tc = testcases[i];
		const actual = result.outputs[i] ?? '';
		const expected = tc.output ?? '';

		if (!compareOutput(actual, expected, question.comparatorType)) {
			finalVerdict = 'WA';
			firstFailedTestCase = {
				input: tc.input,
				expectedOutput: expected,
				actualOutput: actual,
			};
			break;
		}
	}

	await Submission.findByIdAndUpdate(submissionId, {
		verdict: finalVerdict,
		executionTime: result.executionTime,
		completedAt: new Date(),
		...(firstFailedTestCase && { firstFailedTestCase }),
	});

	console.log(`[submitWorker] Submission ${submissionId} → ${finalVerdict}`);
	return { verdict: finalVerdict, executionTime: result.executionTime, firstFailedTestCase };
};

export const startSubmitWorker = () => {
	const worker = new Worker('submitQueue', processSubmit, {
		connection: createRedisConnection(),
		concurrency: 1,
	});

	worker.on('completed', (job) => console.log(`[submitWorker] Job ${job.id} completed`));
	worker.on('failed', (job, err) => console.error(`[submitWorker] Job ${job?.id} failed:`, err.message));
	worker.on('error', (err) => console.error('[submitWorker] Worker error:', err.message));

	console.log('[submitWorker] Started');
	return worker;
};
