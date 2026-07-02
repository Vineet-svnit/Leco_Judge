/**
 * aiService.js
 *
 * AI is used EXACTLY ONCE: to generate the C++ generator program.
 * Everything after that (family discovery, testcase generation) is done
 * by compiling and running the generator in Docker — no further AI calls.
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

/**
 * Generate a C++ testcase generator program from problem metadata.
 *
 * The generated program MUST support two CLI modes:
 *
 *   ./generator --list-families
 *     Prints a JSON array to stdout:
 *     [{"name":"small","description":"..."},{"name":"edge","description":"..."},...]
 *
 *   ./generator --family <name> --count <N>
 *     Prints N testcase inputs to stdout, separated by lines containing exactly "---"
 *
 * AI is called only here. Family discovery and generation are done by running
 * the compiled binary in Docker.
 */
export const generateGenerator = async ({ statement, constraints, topic, officialSolution }) => {
	const solutionHint = officialSolution
		? `\nThe official solution is provided for reference (understand output format and edge cases):\n\`\`\`cpp\n${officialSolution}\n\`\`\``
		: '';

	const prompt = `You are an expert competitive programming problem setter.

Write a standalone C++ testcase generator program for the problem below.

Problem Statement:
${statement}

Constraints:
${constraints}

Topic: ${topic}
${solutionHint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED CLI INTERFACE — THIS IS MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The program must support exactly two invocation modes:

MODE 1 — List families:
  ./generator --list-families
  Prints to stdout a JSON array (and nothing else) like:
  [{"name":"small","description":"Minimum constraints and sanity checks","serialNo":1},{"name":"edge","description":"Boundary inputs","serialNo":2},{"name":"max","description":"Maximum constraint stress cases","serialNo":3},{"name":"known","description":"Famous hand-crafted edge cases""serialNo":4}]

  Rules:
  - Always include "small", "edge", "max" as family names at minimum. Keep "known" (optional only when actually meaningful).
  - Add any problem-specific families (e.g. "duplicates", "sorted", "chain", "star").
	If a problem naturally contains important structural families
	(chain, star, cycle, disconnected, dense-dag),
	expose them as separate families rather than hiding them under edge/max.
  - Family names must be lowercase, single words or hyphenated (machine-readable).
  - Output must be valid JSON. No newlines inside the JSON. No trailing text.

MODE 2 — Generate testcases:
  ./generator --family <name> --count <N> --seed 123
  Prints N testcase inputs to stdout.
  Each testcase is separated by a line containing exactly three dashes: ---
  The last testcase does NOT need a trailing "---".

  Rules:
  - Generate exactly N inputs for the requested family.
  - Use seeded randomness so output is reproducible.
  - Do NOT output anything except the testcase inputs and "---" separators.
  - Same family : Same count : Same seed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAMILY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

small:   Minimum/tiny constraint values, single elements, empty inputs where valid.
edge:    Boundary values, all-same, sorted, reverse-sorted, zeros, negatives.
max:     Maximum constraint values, performance stress, worst-case sizes.
known:   Famous hand-crafted cases specific to this problem type (sorted array for binary search, star graph for BFS, etc.)
Any additional families you deem necessary for this problem.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Return ONLY the raw C++ source code.
- No markdown fences. No explanation. No comments outside the code itself.
- The program must compile with: g++ -O2 -o generator generator.cpp
- Parse argc/argv to detect --list-families and --family / --count flags.`;

	const raw = await chat(prompt);
	return raw.replace(/^```(?:cpp)?\n?/m, '').replace(/\n?```$/m, '').trim();
};
