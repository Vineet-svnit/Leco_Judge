import mongoose from 'mongoose';

const exampleSchema = new mongoose.Schema(
	{
		input: {
			type: String,
		},
		output: {
			type: String,
		},
		explanation: {
			type: String,
		},
	},
	{ _id: false }
);

const questionSchema = new mongoose.Schema(
	{
		adminId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			default: '',
		},
		statement: {
			type: String,
			required: true,
		},
		difficulty: {
			type: String,
			enum: ['EASY', 'MEDIUM', 'HARD'],
			required: true,
		},
		topic: {
			type: String,
		},
		examples: [exampleSchema],
		constraints: {
			type: String,
		},
		timeLimit: {
			type: Number,
		},
		memoryLimit: {
			type: Number,
		},
	},
	{
		timestamps: true,
	}
);

const Question = mongoose.model('Question', questionSchema);

export default Question;