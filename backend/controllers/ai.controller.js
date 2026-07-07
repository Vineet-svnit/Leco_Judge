import { discoverFamilies, generateGenerator } from '../services/aiService.js';
import { runFamily } from '../services/generatorRunner.js';

// POST /admin/ai/discover-families
// AI Call #1 — analyse problem metadata, return structured family list.
export const handleDiscoverFamilies = async (req, res) => {
	try {
		const { statement, constraints, topic, officialSolution, existingFamilies } = req.body;

		if (!statement || !constraints || !topic) {
			return res.status(400).json({
				message: 'statement, constraints, and topic are required.',
			});
		}

		const families = await discoverFamilies({
			statement,
			constraints,
			topic,
			officialSolution: officialSolution || '',
			existingFamilies: Array.isArray(existingFamilies) ? existingFamilies : [],
		});

		return res.status(200).json({ families });
	} catch (err) {
		console.error('[AI] discoverFamilies error:', err.message);
		return res.status(500).json({ message: err.message || 'Family discovery failed.' });
	}
};

// POST /admin/ai/generate-generator
// AI Call #2 — generate C++ generator implementing the supplied families exactly.
export const handleGenerateGenerator = async (req, res) => {
	try {
		const { statement, constraints, topic, officialSolution, families } = req.body;

		if (!statement || !constraints || !topic) {
			return res.status(400).json({
				message: 'statement, constraints, and topic are required.',
			});
		}

		if (!Array.isArray(families) || families.length === 0) {
			return res.status(400).json({
				message: 'families array is required. Run discover-families first.',
			});
		}

		const generatorCode = await generateGenerator({
			statement,
			constraints,
			topic,
			officialSolution: officialSolution || '',
			families,
		});

		return res.status(200).json({ generatorCode });
	} catch (err) {
		console.error('[AI] generateGenerator error:', err.message);
		return res.status(500).json({ message: err.message || 'AI generation failed.' });
	}
};

// POST /admin/generator/run
// Compiles generator in Docker, runs each family. No AI.
// Body: { generatorCode, families: [{ name, count }] }
export const handleRunGenerator = async (req, res) => {
	try {
		const { generatorCode, families } = req.body;

		if (!generatorCode || !Array.isArray(families) || families.length === 0) {
			return res.status(400).json({ message: 'generatorCode and families array are required.' });
		}

		const testcases = [];
		for (const { name, count, familyId } of families) {
			if (!count || count <= 0) continue;
			const seed = Math.floor(Math.random() * 1_000_000);
			const inputs = await runFamily(generatorCode, name, count, seed);
			testcases.push(...inputs.map((input) => ({ input, familyId: familyId || null })));
		}

		return res.status(200).json({ testcases, inputs: testcases.map((tc) => tc.input) });
	} catch (err) {
		console.error('[Generator] run error:', err.message);
		if (err.isCompileError) {
			return res.status(422).json({ message: 'Generator failed to compile.', compilerOutput: err.compilerOutput });
		}
		return res.status(500).json({ message: err.message || 'Generator execution failed.' });
	}
};
