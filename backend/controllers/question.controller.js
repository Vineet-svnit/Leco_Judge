import Question from '../models/question.model.js';

const mapQuestionPayload = (body, adminId) => ({
	adminId,
	title: body.title,
	image: body.image || '',
	statement: body.statement,
	difficulty: body.difficulty,
	topic: body.topic || '',
	examples: body.examples || [],
	constraints: body.constraints || '',
	timeLimit: body.timeLimit,
	memoryLimit: body.memoryLimit,
});

export const listQuestions = async (req, res) => {
	const questions = await Question.find().sort({ createdAt: -1 });
	return res.json({ questions });
};

export const getQuestionById = async (req, res) => {
	const question = await Question.findById(req.params.id);

	if (!question) {
		return res.status(404).json({ message: 'Question not found' });
	}

	return res.json({ question });
};

export const createQuestion = async (req, res) => {
	const question = await Question.create(mapQuestionPayload(req.body, req.user._id));
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