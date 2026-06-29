import TestCase from '../models/testcase.model.js';
import Question from '../models/question.model.js';

// POST /admin/questions/:id/testcases/batch
// Replaces all testcases for a question with the provided array
export const batchSaveTestcases = async (req, res) => {
	try {
		const { id: questionId } = req.params;
		const { testcases } = req.body;

		const question = await Question.findById(questionId);
		if (!question) {
			return res.status(404).json({ message: 'Question not found.' });
		}

		if (!Array.isArray(testcases)) {
			return res.status(400).json({ message: 'testcases must be an array.' });
		}

		// Replace existing testcases for this question
		await TestCase.deleteMany({ questionId });

		const created =
			testcases.length > 0
				? await TestCase.insertMany(
						testcases.map(({ input }) => ({ questionId, input }))
				  )
				: [];

		return res.status(200).json({ testcases: created });
	} catch (error) {
		console.error('batchSaveTestcases error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};

// GET /admin/questions/:id/testcases
export const listTestcases = async (req, res) => {
	try {
		const { id: questionId } = req.params;
		const testcases = await TestCase.find({ questionId }).sort({ createdAt: 1 });
		return res.status(200).json({ testcases });
	} catch (error) {
		console.error('listTestcases error:', error);
		return res.status(500).json({ message: 'Internal server error.' });
	}
};
