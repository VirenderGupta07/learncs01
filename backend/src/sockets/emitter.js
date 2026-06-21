const { Emitter } = require('@socket.io/redis-emitter');
const logger = require('../config/logger');
const redisConnection = require('../config/redis');

/**
 * The certificate worker (and any future background job) runs as a
 * completely separate Node process from the API - it has no Socket.io
 * server of its own. This emitter publishes through the same Redis
 * channels that sockets/index.js's redis-adapter subscribes to, so
 * `emitter.to('user:123').emit(...)` reaches a browser connected to
 * *any* of the API's PM2 cluster workers, exactly like a normal
 * `io.to(...).emit(...)` call would from inside the API itself.
 */
let emitter = null;

if (redisConnection) {
  emitter = new Emitter(redisConnection.duplicate());
} else {
  logger.warn('Socket emitter disabled because Redis is not configured.');
}

module.exports = emitter;
