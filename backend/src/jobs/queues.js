const { Queue } = require('bullmq');
const env = require('../config/env');
const redisConnection = require('../config/redis');

const certificateQueue = env.REDIS_URL && redisConnection
  ? new Queue('certificate-generation', { connection: redisConnection })
  : null;

module.exports = { certificateQueue };
