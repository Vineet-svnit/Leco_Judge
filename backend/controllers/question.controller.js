import Question from '../models/question.model.js';
import Counter from '../models/counter.model.js';

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
	comparatorType: body.comparatorType || 'EXACT_MATCH',
	timeLimit: body.timeLimit,
	memoryLimit: body.memoryLimit,
});

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
	}

	return res.json({ question: data });
};

export const createQuestion = async (req, res) => {
	const questionNo = await getNextQuestionNo();
	const question = await Question.create({
		...mapQuestionPayload(req.body, req.user._id),
		questionNo,
	});
	return res.status(201).json({ message: 'Question created', question });
};

export const updateQuestion = async (req, res) => {
	const question = await Question.findById(req.params.id);

	if (!question) {
		return res.status(404).json({ message: 'Question not found' });
	}

	const payload = mapQuestionPayload(req.body, question.adminId);
	Object.assign(question, payload);
	await question.save();

	return res.json({ message: 'Question updated', question });
};