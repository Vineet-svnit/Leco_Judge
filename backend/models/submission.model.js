import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		questionId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Question',
		},
		language: {
			type: String,
			required: true,
		},
		code: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ['PENDING', 'RUNNING', 'COMPLETED'],
			default: 'PENDING',
		},
		verdict: {
			type: String,
			enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'SYSTEM_ERROR'],
		},
		executionTime: {
			type: Number,
		},
		memoryUsed: {
			type: Number,
		},
		compilerOutput: {
			type: String,
		},
		firstFailedTestCase: {
			type: mongoose.Schema.Types.Mixed,
		},
		startedAt: {
			type: Date,
		},
		completedAt: {
			type: Date,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;