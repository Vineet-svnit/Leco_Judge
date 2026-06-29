import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

// Queue for official submissions.
// Jobs carry only { submissionId } — worker loads full data from MongoDB.
const submitQueue = new Queue('submitQueue', {
	connection: createRedisConnection(),
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 2000 },
		removeOnComplete: { count: 200 },
		removeOnFail: { count: 500 },
	},
});

export default submitQueue;
