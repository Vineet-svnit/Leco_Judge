/**
 * dockerJudge.js
 *
 * Core execution engine. Spins up one Docker container per job,
 * compiles once, then runs one process per testcase input.
 *
 * Design follows Docker_Design.md:
 *   1 container per submission
 *   1 process per testcase
 *   compile once, fail fast on CE
 */

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DOCKER_IMAGE = process.env.JUDGE_DOCKER_IMAGE || 'gcc:13';
const DEFAULT_TIME_LIMIT_MS = 2000;
const DEFAULT_MEMORY_MB = 256;
const COMPILE_TIMEOUT_MS = 15000;

/**
 * Run code inside Docker against an array of inputs.
 *
 * @param {object} opts
 * @param {string} opts.sourceCode   - Complete compilable C++ source
 * @param {string[]} opts.inputs     - Array of testcase input strings
 * @param {number} [opts.timeLimitMs]
 * @param {number} [opts.memoryMb]
 * @returns {Promise<JudgeResult>}
 */
export const runInDocker = async ({
	sourceCode,
	inputs,
	timeLimitMs = DEFAULT_TIME_LIMIT_MS,
	memoryMb = DEFAULT_MEMORY_MB,
}) => {
	// Create a temp directory on the host — mounted into the container
	const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'leco-'));
	const srcFile = path.join(workDir, 'solution.cpp');
	const binFile = path.join(workDir, 'solution');

	try {
		await fs.writeFile(srcFile, sourceCode, 'utf8');

		// ── Step 1: Compile ────────────────────────────────────────────
		let compilerOutput = '';
		try {
			await execFileAsync('docker', [
				'run', '--rm',
				'--network', 'none',
				`--memory=${memoryMb}m`,
				'--cpus=1',
				'-v', `${workDir}:/code`,
				'-w', '/code',
				DOCKER_IMAGE,
				'g++', '-O2', '-o', 'solution', 'solution.cpp',
			], { timeout: COMPILE_TIMEOUT_MS });
		} catch (err) {
			compilerOutput = (err.stderr || err.stdout || err.message || '').toString().trim();
			return { verdict: 'CE', compilerOutput, outputs: [], executionTime: 0 };
		}

		// ── Step 2: Run one process per testcase ──────────────────────
		const outputs = [];
		let verdict = 'AC';
		let firstFailedTestCase = null;
		let totalTime = 0;

		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i];
			const inputFile = path.join(workDir, `input_${i}.txt`);
			await fs.writeFile(inputFile, input, 'utf8');

			const start = Date.now();
			let stdout = '';
			let timedOut = false;
			let runtimeError = false;
			let memoryExceeded = false;

			try {
				const result = await execFileAsync('docker', [
					'run', '--rm',
					'--network', 'none',
					`--memory=${memoryMb}m`,
					`--memory-swap=${memoryMb}m`, // disable swap so OOM kill fires on limit
					'--cpus=1',
					'-v', `${workDir}:/code`,
					'-w', '/code',
					DOCKER_IMAGE,
					'bash', '-c', `./solution < input_${i}.txt`,
				], { timeout: timeLimitMs + 1000 });

				stdout = (result.stdout || '').toString().trimEnd();
			} catch (err) {
				// err.killed = true  → Node's timeout fired          → TLE
				// err.code === 137   → Docker OOM SIGKILL             → MLE
				// anything else      → program crashed (RE)           → RE
				//
				// NOTE: do NOT use elapsed time to classify TLE.
				// elapsed includes Docker container startup overhead and will
				// misclassify instant RE crashes as TLE when timeLimitMs is small.
				// err.killed is the authoritative signal that Node's timeout fired.
				if (err.killed) {
					timedOut = true;
					verdict = 'TLE';
				} else if (err.code === 137) {
					memoryExceeded = true;
					verdict = 'MLE';
				} else {
					runtimeError = true;
					verdict = 'RE';
				}
			}

			const elapsed = Date.now() - start;
			totalTime = Math.max(totalTime, elapsed);

			outputs.push(stdout);

			if (timedOut || runtimeError || memoryExceeded) {
				firstFailedTestCase = { index: i, input };
				break; // stop on first failure
			}
		}

		return {
			verdict,
			outputs,
			executionTime: totalTime,
			compilerOutput,
			firstFailedTestCase,
		};
	} finally {
		// Always clean up temp dir
		await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
};

/**
 * Build the final compilable source by injecting user code into the template.
 * Replaces LECO_USER_CODE placeholder with the user's class/function.
 */
export const buildFinalSource = (codeSnippet, userCode) => {
	if (!codeSnippet.includes('LECO_USER_CODE')) {
		throw new Error('codeSnippet does not contain LECO_USER_CODE placeholder');
	}
	return codeSnippet.replace('LECO_USER_CODE', userCode);
};

/**
 * Compare actual vs expected output according to the question's comparatorType.
 */
export const compareOutput = (actual, expected, comparatorType) => {
	const normalize = (s) => s.trim().replace(/\r\n/g, '\n');

	switch (comparatorType) {
		case 'EXACT_MATCH':
			return normalize(actual) === normalize(expected);

		case 'FLOAT_EPSILON': {
			const EPSILON = 1e-5;
			const a = parseFloat(actual);
			const e = parseFloat(expected);
			if (isNaN(a) || isNaN(e)) return false;
			return Math.abs(a - e) <= EPSILON;
		}

		case 'UNORDERED_VECTOR': {
			const toSortedTokens = (s) =>
				normalize(s).split(/\s+/).filter(Boolean).sort().join(' ');
			return toSortedTokens(actual) === toSortedTokens(expected);
		}

		case 'CUSTOM':
			// Custom comparator not yet implemented — fall back to exact match
			return normalize(actual) === normalize(expected);

		default:
			return normalize(actual) === normalize(expected);
	}
};
