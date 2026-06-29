import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

// Queue for run (non-persistent) jobs.
// Jobs carry { questionId, language, code } — no DB record for run.
// Worker loads question data (template, examples) from MongoDB.
const runQueue = new Queue('runQueue', {
	connection: createRedisConnection(),
	defaultJobOptions: {
		attempts: 1,          // run jobs are not retried — user will resubmit if needed
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 100 },
	},
});

export default runQueue;
