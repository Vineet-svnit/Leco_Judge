import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection used by BullMQ queues and workers.
// BullMQ requires separate connection instances for Queue vs Worker,
// so we export a factory instead of a singleton.
export const createRedisConnection = () =>
	new Redis(REDIS_URL, {
		maxRetriesPerRequest: null, // required by BullMQ
	});
