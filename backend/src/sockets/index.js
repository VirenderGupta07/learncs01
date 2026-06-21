const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const env = require('../config/env');
const redisConnection = require('../config/redis');
const logger = require('../config/logger');
const socketAuth = require('./socketAuth');
const registerChatHandlers = require('./chat.socket');

function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URLS, credentials: true },
  });

  // Required for correctness once the API runs as more than one process
  // (see backend/ecosystem.config.js, which runs the API in PM2 cluster
  // mode across all CPU cores). Without this adapter, a notification or
  // chat message handled by worker process A would never reach a socket
  // connected to worker process B - `io.to(...)` only broadcasts within a
  // single process's in-memory room registry by default. Reusing the
  // existing Redis connection (also used for BullMQ) avoids standing up a
  // second Redis just for this.
  const pubClient = redisConnection.duplicate();
  const subClient = redisConnection.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  pubClient.on('error', (err) => logger.error(`Socket.io Redis pub client error: ${err.message}`));
  subClient.on('error', (err) => logger.error(`Socket.io Redis sub client error: ${err.message}`));

  io.use(socketAuth);

  io.on('connection', (socket) => {
    // Every user gets a private room keyed by their ID - this is the channel
    // the certificate worker and chat handler use for live push notifications.
    socket.join(`user:${socket.user._id}`);

    registerChatHandlers(io, socket);
  });

  return io;
}

module.exports = initSockets;
