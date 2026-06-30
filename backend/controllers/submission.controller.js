import { QueueEvents } from 'bullmq';

import Submission from '../models/submission.model.js';
import Question from '../models/question.model.js';
import submitQueue from '../queues/submitQueue.js';
import runQueue from '../queues/runQueue.js';
import { createRedisConnection } from '../config/redis.js';

// One shared QueueEvents instance per queue — created once, reused across requests.
// This avoids the race condition where a per-request QueueEvents misses the
// 'completed' event because the worker finishes before the listener is ready.
const submitQueueEvents = new QueueEvents('submitQueue', { connection: createRedisConnection() });
const runQueueEvents = new QueueEvents('runQueue', { connection: createRedisConnection() });

// POST /submissions/submit
export const submitCode = async (req, res) => {
	try {
		const { questionId, language, code } = req.body;

		if (!questionId || !language || !code) {
			return res.status(400).json({ message: 'questionId, language, and code are required.' });
		}

		const question = await Question.findById(questionId);
		if (!question) {
			return res.status(404).json({ message: 'Question not found.' });
		}

		const submission = await Submission.create({
			userId: req.user._id,
			questionId,
			language,
			code,
			status: 'PENDING',
		});

		const job = await submitQueue.add('judge', { submissionId: submission._id.toString() });

		// waitUntilFinished handles the race internally — safe even if worker
		// completes before this line executes
		const result = await job.waitUntilFinished(submitQueueEvents);

		return res.status(200).json({
			submissionId: submission._id,
			...(typeof result === 'string' ? JSON.parse(result) : result),
		});
	} catch (error) {
		console.error('submitCode error:', error);
		return res.status(500).json({ message: 'Internal server error.', detail: error.message });
	}
};

// POST /submissions/run
export const runCode = async (req, res) => {
	try {
		const { questionId, language, code } = req.body;

		if (!questionId || !language || !code) {
			return res.status(400).json({ message: 'questionId, language, and code are required.' });
		}

		const question = await Question.findById(questionId);
		if (!question) {
			return res.status(404).json({ message: 'Question not found.' });
		}

		const job = await runQueue.add('run', { questionId, language, code });

		const result = await job.waitUntilFinished(runQueueEvents);

		return res.status(200).json(typeof result === 'string' ? JSON.parse(result) : result);
	} catch (error) {
		console.error('runCode error:', error);
		return res.status(500).json({ message: 'Internal server error.', detail: error.message });
	}
};

// GET /submissions/:id
export const getSubmissionStatus = async (req, res) => {
	try {
		const submission = await Submission.findById(req.params.id);

		if (!submission) {
			return res.status(404).json({ message: 'Submission not found.' });
		}

		if (submission.userId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'Access denied.' });
		}

		return res.status(200).json({ submission });
	} catch (error) {
		console.error('getSubmissionStatus error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};

// GET /submissions?questionId=<id>
export const getSubmissionHistory = async (req, res) => {
	try {
		const { questionId } = req.query;

		if (!questionId) {
			return res.status(400).json({ message: 'questionId query param is required.' });
		}

		const submissions = await Submission.find({
			userId: req.user._id,
			questionId,
		}).sort({ createdAt: -1 });

		return res.status(200).json({ submissions });
	} catch (error) {
		console.error('getSubmissionHistory error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};
