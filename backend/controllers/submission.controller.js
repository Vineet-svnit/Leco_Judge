import Submission from '../models/submission.model.js';
import Question from '../models/question.model.js';
import submitQueue from '../queues/submitQueue.js';
import runQueue from '../queues/runQueue.js';

// POST /submissions/submit
// Saves submission to DB with status PENDING, then enqueues to submitQueue
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

		// Enqueue — worker loads full data from MongoDB using submissionId
		await submitQueue.add('judge', { submissionId: submission._id.toString() });

		return res.status(201).json({ submission });
	} catch (error) {
		console.error('submitCode error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};

// POST /submissions/run
// No DB record — enqueues directly to runQueue with minimal payload
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

		// Enqueue — worker loads question data (template, examples) from MongoDB
		const job = await runQueue.add('run', { questionId, language, code });

		return res.status(200).json({ jobId: job.id, message: 'Run job queued.' });
	} catch (error) {
		console.error('runCode error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};

// GET /submissions/:id
// Returns a single submission (used for polling status)
export const getSubmissionStatus = async (req, res) => {
	try {
		const submission = await Submission.findById(req.params.id);

		if (!submission) {
			return res.status(404).json({ message: 'Submission not found.' });
		}

		// Only the owner can poll their submission
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
// Returns the current user's submission history for a question
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
