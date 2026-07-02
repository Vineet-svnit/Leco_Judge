/**
 * generatorRunner.js
 *
 * Compiles and runs a C++ generator program in Docker.
 * No AI involvement — purely deterministic execution.
 *
 * Two operations:
 *   listFamilies(generatorCode)           → [{ name, description }]
 *   runFamily(generatorCode, name, count) → string[]  (testcase inputs)
 */

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DOCKER_IMAGE = process.env.JUDGE_DOCKER_IMAGE || 'gcc:13';
const COMPILE_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 30000; // generators can be slow for large counts
const RUN_MEM_SPACE = 1024 * 1024 * 50;

/**
 * Compile the generator and return the workDir.
 * Caller is responsible for cleaning up.
 */
const compileGenerator = async (generatorCode) => {
	const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'leco-gen-'));
	const srcFile = path.join(workDir, 'generator.cpp');

	await fs.writeFile(srcFile, generatorCode, 'utf8');

	try {
		await execFileAsync('docker', [
			'run', '--rm',
			'--network', 'none',
			'--memory=512m',
			'--cpus=1',
			'-v', `${workDir}:/code`,
			'-w', '/code',
			DOCKER_IMAGE,
			'g++', '-O2', '-o', 'generator', 'generator.cpp',
		], { timeout: COMPILE_TIMEOUT_MS });
	} catch (err) {
		await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
		const compilerOutput = (err.stderr || err.stdout || err.message || '').toString().trim();
		throw Object.assign(new Error('Generator compile error'), { compilerOutput, isCompileError: true });
	}

	return workDir;
};

/**
 * List available testcase families by running: ./generator --list-families
 * Returns parsed JSON array of { name, description } objects.
 */
export const listFamilies = async (generatorCode) => {
	let workDir;
	try {
		workDir = await compileGenerator(generatorCode);

		const result = await execFileAsync('docker', [
			'run', '--rm',
			'--network', 'none',
			'--memory=256m',
			'--cpus=1',
			'-v', `${workDir}:/code`,
			'-w', '/code',
			DOCKER_IMAGE,
			'./generator', '--list-families',
		], { timeout: RUN_TIMEOUT_MS });

		const raw = (result.stdout || '').toString().trim();
		return JSON.parse(raw);
	} finally {
		if (workDir) await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
};

/**
 * Generate N testcase inputs for a given family by running:
 *   ./generator --family <name> --count <N>
 * Returns an array of input strings.
 */
export const runFamily = async (generatorCode, family, count, seed) => {
	let workDir;
	try {
		workDir = await compileGenerator(generatorCode);

		const result = await execFileAsync('docker', [
			'run', '--rm',
			'--network', 'none',
			'--memory=256m',
			'--cpus=1',
			'-v', `${workDir}:/code`,
			'-w', '/code',
			DOCKER_IMAGE,
			'./generator',
			'--family', family,
			'--count', String(count),
			'--seed', String(seed),
		], { timeout: RUN_TIMEOUT_MS,
			maxBuffer: RUN_MEM_SPACE
		 });

		const raw = (result.stdout || '').toString();
		return raw
			.split(/^---$/m)
			.map((s) => s.trim())
			.filter(Boolean);
	} finally {
		if (workDir) await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
};
