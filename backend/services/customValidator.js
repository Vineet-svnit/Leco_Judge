import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const DOCKER_IMAGE = process.env.JUDGE_DOCKER_IMAGE || 'gcc:13';
const COMPILE_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 5000;
const RUN_MEM_SPACE = 1024 * 1024 * 8;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALIDATOR_CACHE_DIR = path.resolve(__dirname, '..', 'generated', 'validators');

const sha256 = (source) => createHash('sha256').update(source, 'utf8').digest('hex');

const getBinaryPath = (validatorHash) => path.join(VALIDATOR_CACHE_DIR, validatorHash);

const ensureDirectory = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

export const ensureValidatorBinary = async (validatorCode, existingHash = '') => {
    const validatorHash = sha256(validatorCode);
    const binaryPath = getBinaryPath(validatorHash);

    if (existingHash === validatorHash) {
        try {
            await fs.access(binaryPath);
            return { validatorHash, binaryPath, compiled: false };
        } catch (error) {
            await fs.rm(binaryPath, { force: true }).catch(() => { });

            const compilerOutput =
                (error.stderr || error.stdout || error.message || '')
                    .toString()
                    .trim();

            throw Object.assign(
                new Error('Validator compile error'),
                {
                    compilerOutput,
                    validatorHash,
                    isCompileError: true,
                }
            );
        }
    }

    try {
        await fs.access(binaryPath);
        return { validatorHash, binaryPath, compiled: false };
    } catch {
        // compile below
    }

    await ensureDirectory(VALIDATOR_CACHE_DIR);
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'leco-validator-'));

    try {
        const srcFile = path.join(workDir, 'validator.cpp');
        await fs.writeFile(srcFile, validatorCode, 'utf8');

        await execFileAsync(
            'docker',
            [
                'run',
                '--rm',
                '--network', 'none',
                '--memory=512m',
                '--cpus=1',
                '-v', `${workDir}:/code`,
                '-v', `${VALIDATOR_CACHE_DIR}:/cache`,
                '-w', '/code',
                DOCKER_IMAGE,
                'g++',
                '-O2',
                '-std=c++17',
                '-o', `/cache/${validatorHash}`,
                'validator.cpp',
            ],
            { timeout: COMPILE_TIMEOUT_MS }
        );

        await fs.chmod(binaryPath, 0o755).catch(() => { });
        return { validatorHash, binaryPath, compiled: true };
    } catch (error) {
        await fs.rm(binaryPath, { force: true }).catch(() => { });
        const compilerOutput = (error.stderr || error.stdout || error.message || '').toString().trim();
        throw Object.assign(new Error('Validator compile error'), {
            compilerOutput,
            isCompileError: true,
        });
    } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
};

export const runValidatorBinary = async ({ binaryPath, input, expectedOutput, actualOutput }) => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'leco-validator-run-'));

    try {
        await fs.writeFile(path.join(workDir, 'input.txt'), input ?? '', 'utf8');
        await fs.writeFile(path.join(workDir, 'expected.txt'), expectedOutput ?? '', 'utf8');
        await fs.writeFile(path.join(workDir, 'actual.txt'), actualOutput ?? '', 'utf8');

        const binaryName = path.basename(binaryPath);
        const binaryDir = path.dirname(binaryPath);

        const result = await execFileAsync(
            'docker',
            [
                'run',
                '--rm',
                '--network', 'none',
                '--memory=256m',
                '--cpus=1',
                '-v', `${workDir}:/work`,
                '-v', `${binaryDir}:/validators`,
                '-w', '/work',
                DOCKER_IMAGE,
                `/validators/${binaryName}`,
                '/work/input.txt',
                '/work/expected.txt',
                '/work/actual.txt',
            ],
            { timeout: RUN_TIMEOUT_MS, maxBuffer: RUN_MEM_SPACE }
        );

        return {
            passed: true,
            stdout: (result.stdout || '').toString(),
            stderr: (result.stderr || '').toString(),
        };
    } catch (error) {
        if (error.code === 1) {
            return {
                passed: false,
                stdout: (error.stdout || '').toString(),
                stderr: (error.stderr || '').toString(),
            };
        }

        const message = (error.stderr || error.stdout || error.message || '').toString().trim();
        throw Object.assign(new Error(message || 'Validator execution error'), {
            message,
            isValidatorError: true,
        });
    } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
};