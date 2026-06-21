const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const certificateQueue = new Queue('certificate-generation', { connection: redisConnection });

module.exports = { certificateQueue };
