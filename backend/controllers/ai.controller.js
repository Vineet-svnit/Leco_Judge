import { generateGenerator } from '../services/aiService.js';
import { listFamilies, runFamily } from '../services/generatorRunner.js';

// POST /admin/ai/generate-generator
// Only AI call in the entire testcase generation flow.
export const handleGenerateGenerator = async (req, res) => {
	try {
		const { statement, constraints, topic, officialSolution } = req.body;

		if (!statement || !constraints || !topic) {
			return res.status(400).json({
				message: 'statement, constraints, and topic are required.',
			});
		}

		const generatorCode = await generateGenerator({
			statement,
			constraints,
			topic,
			officialSolution: officialSolution || '',
		});

		return res.status(200).json({ generatorCode });
	} catch (err) {
		console.error('[AI] generateGenerator error:', err.message);
		return res.status(500).json({ message: err.message || 'AI generation failed.' });
	}
};

// POST /admin/generator/list-families
// Compiles generator in Docker, runs --list-families, returns JSON. No AI.
export const handleListFamilies = async (req, res) => {
	try {
		const { generatorCode } = req.body;
		if (!generatorCode) {
			return res.status(400).json({ message: 'generatorCode is required.' });
		}

		const families = await listFamilies(generatorCode);
		return res.status(200).json({ families });
	} catch (err) {
		console.error('[Generator] listFamilies error:', err.message);
		if (err.isCompileError) {
			return res.status(422).json({ message: 'Generator failed to compile.', compilerOutput: err.compilerOutput });
		}
		return res.status(500).json({ message: err.message || 'Family discovery failed.' });
	}
};

// POST /admin/generator/run
// Compiles generator in Docker, runs --family <name> --count <N>. No AI.
// Body: { generatorCode, families: [{ name, count }] }
// Runs each family separately and merges all inputs.
export const handleRunGenerator = async (req, res) => {
	try {
		const { generatorCode, families } = req.body;

		if (!generatorCode || !Array.isArray(families) || families.length === 0) {
			return res.status(400).json({ message: 'generatorCode and families array are required.' });
		}

		// Run each requested family and collect inputs
		const allInputs = [];
		for (const { name, count } of families) {
			if (!count || count <= 0) continue;
			const seed = Math.floor(Math.random() * 1000000);
			const inputs = await runFamily(generatorCode, name, count, seed);
			allInputs.push(...inputs);
		}

		return res.status(200).json({ inputs: allInputs });
	} catch (err) {
		console.error('[Generator] run error:', err.message);
		if (err.isCompileError) {
			return res.status(422).json({ message: 'Generator failed to compile.', compilerOutput: err.compilerOutput });
		}
		return res.status(500).json({ message: err.message || 'Generator execution failed.' });
	}
};
