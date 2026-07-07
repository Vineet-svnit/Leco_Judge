import mongoose from 'mongoose';

const familySchema = new mongoose.Schema(
	{
		name:             { type: String, required: true },
		description:      { type: String, default: '' },
		bugTargeted:      { type: String, default: '' },
		recommendedCount: { type: Number, default: 5 },
		source:           { type: String, enum: ['ai', 'manual'], default: 'ai' },
	},
	{ timestamps: false }
);

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
		image: {
			type: String,
			default: '',
		},
	},
	{ _id: false }
);

const languageSnippetSchema = new mongoose.Schema(
	{
		lang: {
			type: String,
			required: true,
			enum: ['cpp'],
		},
		codeSnippet: {
			type: String,
			required: true,
		},
		classSnippet: {
			type: String,
			required: true,
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
		questionNo: {
			type: Number,
			unique: true,
			sparse: true,
			index: true,
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
		languages: {
			type: [languageSnippetSchema],
			validate: {
				validator: function (v) {
					return v && v.length > 0;
				},
				message: 'At least one language snippet must be provided.',
			},
		},
		officialSolution: {
			type: String,
			default: '',
		},
		validatorCode: {
			type: String,
			default: '',
			validate: {
				validator: function (value) {
					return this.comparatorType !== 'CUSTOM' || Boolean(value && value.trim());
				},
				message: 'validatorCode is required when comparatorType is CUSTOM.',
			},
		},
		validatorHash: {
			type: String,
			default: '',
		},
		generatorCode: {
			type: String,
			default: '',
		},
		families: {
			type: [familySchema],
			default: [],
		},
		comparatorType: {
			type: String,
			enum: ['EXACT_MATCH', 'FLOAT_EPSILON', 'CUSTOM'],
			default: 'EXACT_MATCH',
		},
		timeLimit: {
			type: Number,
			default: 1000
		},
		memoryLimit: {
			type: Number,
			default: 256
		},
	},
	{
		timestamps: true,
	}
);

const Question = mongoose.model('Question', questionSchema);

export default Question;