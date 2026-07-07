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
		isPublic: {
			type: Boolean,
			default: true
		},
		output: {
			type: String,
			default: '',
		},
		status: {
			type: String,
			enum: ['PENDING', 'PASSED', 'FAILED'],
			default: 'PENDING',
		},
		errorType: {
			type: String,
			default: '',
		},
		errorMessage: {
			type: String,
			default: '',
		},
		familyId: {
			type: mongoose.Schema.Types.ObjectId,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

const TestCase = mongoose.model('TestCase', testCaseSchema);

export default TestCase;