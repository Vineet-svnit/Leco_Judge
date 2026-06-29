import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
	{
		questionId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Question',
		},
		input: {
			type: String,
			required: true,
		},
		output: {
			type: String,
			default: '',
		},
	},
	{
		timestamps: true,
	}
);

const TestCase = mongoose.model('TestCase', testCaseSchema);

export default TestCase;