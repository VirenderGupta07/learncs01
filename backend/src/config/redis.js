const IORedis = require('ioredis');
const env = require('./env');

const connection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : null;

module.exports = connection;
