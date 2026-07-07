import Question from '../models/question.model.js';
import Counter from '../models/counter.model.js';
import { ensureValidatorBinary } from '../services/customValidator.js';

const mapQuestionPayload = (body, adminId) => ({
	adminId,
	title: body.title,
	image: body.image || '',
	statement: body.statement,
	difficulty: body.difficulty,
	topic: body.topic || '',
	examples: body.examples || [],
	constraints: body.constraints || '',
	languages: body.languages || [],
	officialSolution: body.officialSolution || '',
	validatorCode: body.validatorCode || '',
	generatorCode: body.generatorCode || '',
	families: (body.families || []).map(({ _id, name, description, bugTargeted, recommendedCount, source }) => ({
		_id,
		name,
		description,
		bugTargeted,
		recommendedCount,
		source,
	})),
	comparatorType: body.comparatorType || 'EXACT_MATCH',
	timeLimit: body.timeLimit,
	memoryLimit: body.memoryLimit,
});

const prepareQuestionPayload = async (body, adminId, existingQuestion = null) => {
	const payload = mapQuestionPayload(body, adminId);

	if (payload.comparatorType === 'CUSTOM') {
		if (!payload.validatorCode?.trim()) {
			throw new Error('validatorCode is required when comparatorType is CUSTOM.');
		}

		const { validatorHash } = await ensureValidatorBinary(payload.validatorCode, existingQuestion?.validatorHash || '');
		payload.validatorHash = validatorHash;
	} else {
		payload.validatorHash = '';
	}

	return payload;
};

const getNextQuestionNo = async () => {
	const counter = await Counter.findOneAndUpdate(
		{ _id: 'questionNo' },
		{ $inc: { sequence: 1 } },
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	);

	return counter.sequence;
};

export const listQuestions = async (req, res) => {
	const questions = await Question.find().sort({ createdAt: -1 });
	return res.json({ questions });
};

export const getQuestionById = async (req, res) => {
	const question = await Question.findById(req.params.id);

	if (!question) {
		return res.status(404).json({ message: 'Question not found' });
	}

	// officialSolution is admin-only — strip it from public responses
	const isAdmin = req.user?.role === 'ADMIN';
	const data = question.toObject();
	if (!isAdmin) {
		delete data.officialSolution;
		delete data.validatorCode;
		delete data.validatorHash;
		delete data.generatorCode;
	}

	return res.json({ question: data });
};

export const createQuestion = async (req, res) => {
	try {
		const questionNo = await getNextQuestionNo();
		const payload = await prepareQuestionPayload(req.body, req.user._id);
		const question = await Question.create({
			...payload,
			questionNo,
		});
		return res.status(201).json({ message: 'Question created', question });
	} catch (error) {
		return res.status(error.isCompileError ? 422 : 400).json({
			message: error.message || 'Failed to create question.',
			...(error.isCompileError && { compilerOutput: error.compilerOutput }),
		});
	}
};

export const updateQuestion = async (req, res) => {
	const question = await Question.findById(req.params.id);

	if (!question) {
		return res.status(404).json({ message: 'Question not found' });
	}

	try {
		const payload = await prepareQuestionPayload(req.body, question.adminId, question);
		Object.assign(question, payload);
		await question.save();

		return res.json({ message: 'Question updated', question });
	} catch (error) {
		return res.status(error.isCompileError ? 422 : 400).json({
			message: error.message || 'Failed to update question.',
			...(error.isCompileError && { compilerOutput: error.compilerOutput }),
		});
	}
};