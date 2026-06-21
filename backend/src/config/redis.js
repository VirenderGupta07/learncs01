const IORedis = require('ioredis');
const env = require('./env');

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

module.exports = connection;
