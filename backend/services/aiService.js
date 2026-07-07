/**
 * aiService.js
 *
 * AI is used exactly twice:
 *   1. discoverFamilies  — understand the problem, return structured family JSON
 *                          (accepts existingFamilies to avoid repeating concepts)
 *   2. generateGenerator — produce a C++ generator implementing exactly those families
 *
 * Everything after that (compiling, running, output generation) is deterministic
 * Docker execution with no further AI involvement.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const getClient = () => {
	const key = process.env.GEMINI_API_KEY;
	if (!key) throw new Error('GEMINI_API_KEY is not set in environment.');
	return new GoogleGenerativeAI(key);
};

const MODEL = 'gemini-2.5-flash';

const chat = async (prompt) => {
	const genAI = getClient();
	const model = genAI.getGenerativeModel({ model: MODEL });
	const result = await model.generateContent(prompt);
	return result.response.text().trim();
};

const stripFences = (raw) =>
	raw.replace(/^```(?:\w+)?\n?/m, '').replace(/\n?```$/m, '').trim();

// ── AI Call #1: Discover testcase families ────────────────────────────────────
/**
 * Analyse problem metadata and return NEW testcase families.
 * existingFamilies: families already stored on the question — AI will not repeat them.
 * Returns: Array<{ name, description, bugTargeted, recommendedCount }>
 */
export const discoverFamilies = async ({
	statement,
	constraints,
	topic,
	officialSolution,
	existingFamilies = [],
}) => {
	const solutionHint = officialSolution
		? `\nOfficial Solution (for reference only):\n\`\`\`cpp\n${officialSolution}\n\`\`\``
		: '';

	const existingSection =
		existingFamilies.length > 0
			? `\nThe following testcase families already exist for this problem. Do NOT repeat or overlap with them:\n${existingFamilies
					.map((f) => `- ${f.name}: ${f.description}`)
					.join(
						'\n'
					)}\n\nGenerate ONLY additional non-overlapping families that target different bugs or scenarios.`
			: '';

	const prompt = `You are an expert competitive programming problem setter.

Given the following problem, identify${existingFamilies.length > 0 ? ' ADDITIONAL' : ' the most important'} testcase families.

Problem Statement:
${statement}

Constraints:
${constraints}

Topic: ${topic}
${solutionHint}
${existingSection}

Focus on:
1. Common incorrect solutions and what breaks them.
2. Structural cases specific to this problem type (e.g. cycle, chain, star, disconnected for graphs).
3. Complexity attacks (worst-case inputs for naive solutions).
4. Famous competitive programming corner cases for this problem category.
5. Correctness edge cases.

Rules:
- Do NOT use generic names like: small, edge, max, known, stress.
- Use specific, meaningful, machine-readable names (lowercase, hyphenated if needed).
  Examples: cycle, self-loop, disconnected, all-same, target-absent, chain, dense-dag, branching-explosion
- Each family must have a clear "bugTargeted" describing what incorrect solution it breaks.
- Return 4–8 new families. Never fewer than 2.
- recommendedCount should be 3–10 per family.

Return ONLY a JSON array. No explanation. No markdown. No trailing text.
Format:
[
  {
    "name": "cycle",
    "description": "Directed graph containing a cycle",
    "bugTargeted": "Solutions that use DFS without visited tracking",
    "recommendedCount": 5
  }
]`;

	const raw = await chat(prompt);
	return JSON.parse(stripFences(raw));
};

// ── AI Call #2: Generate the C++ generator implementing exact families ─────────
/**
 * Generate a standalone C++ generator that implements EXACTLY the supplied families.
 * families: Array<{ name, description, bugTargeted, recommendedCount }>
 */
export const generateGenerator = async ({
	statement,
	constraints,
	topic,
	officialSolution,
	families,
}) => {
	const familiesJson = JSON.stringify(families, null, 2);

	const solutionHint = officialSolution
		? `\nOfficial Solution (understand input/output format and edge cases):\n\`\`\`cpp\n${officialSolution}\n\`\`\``
		: '';

	const prompt = `You are an expert competitive programming problem setter.

Implement a standalone C++ testcase generator for the problem below.

Problem Statement:
${statement}

Constraints:
${constraints}

Topic: ${topic}
${solutionHint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTCASE FAMILIES — IMPLEMENT THESE EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following families have been pre-selected. You MUST:
1. Implement every family listed below.
2. Do NOT invent new families.
3. Do NOT merge families.
4. Do NOT hide families under generic categories.

Families:
${familiesJson}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED CLI INTERFACE — MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 1 — List families:
  ./generator --list-families
  Prints to stdout a JSON array (nothing else):
  [{"name":"cycle","description":"...","recommendedCount":5}, ...]

  Rules:
  - The names MUST exactly match the family names supplied above.
  - Output must be valid JSON, single line, no trailing text.

MODE 2 — Generate testcases:
  ./generator --family <name> --count <N> --seed <S>
  Prints N testcase inputs to stdout.
  Separates each testcase with a line containing exactly: ---
  Last testcase does NOT need a trailing ---.

  Rules:
  - Generate exactly N inputs for the named family.
  - Use the seed S for all random number generation (deterministic).
  - Output ONLY testcase inputs and --- separators. Nothing else.
  - Each family must generate testcases targeting the bugTargeted behaviour.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Return ONLY raw C++ source code.
- No markdown fences. No explanation. No comments outside the code.
- Must compile with: g++ -O2 -o generator generator.cpp
- Parse argc/argv for --list-families, --family, --count, --seed flags.`;

	const raw = await chat(prompt);
	return stripFences(raw);
};
