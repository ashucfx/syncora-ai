// BullMQ manages its own Redis connection internally.
// Pass connection options (string or object), NOT a Redis instance,
// to avoid ioredis version mismatch type errors.

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisConnectionOptions = {
  url: redisUrl,
  maxRetriesPerRequest: null as null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
};

export const getRedisConnection = () => redisConnectionOptions;
