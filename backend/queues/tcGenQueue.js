import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

// Queue for generating testcase expected outputs using the official solution.
// Triggered when admin saves testcases.
// Jobs carry only { questionId } — worker loads everything from MongoDB.
const tcGenQueue = new Queue('tcGenQueue', {
	connection: createRedisConnection(),
	defaultJobOptions: {
		attempts: 2,
		backoff: { type: 'fixed', delay: 3000 },
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 200 },
	},
});

export default tcGenQueue;
