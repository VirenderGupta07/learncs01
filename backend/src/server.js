require('dotenv').config();
const http = require('http');
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const initSockets = require('./sockets');

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

const server = http.createServer(app);
initSockets(server);

connectDB()
  .then(() => {
    server.listen(env.PORT, () => {
      logger.info(`LearnCS01 API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    if (env.RUN_WORKER_INLINE) {
      // eslint-disable-next-line global-require
      const { createCertificateWorker } = require('./jobs/certificateWorkerCore');
      createCertificateWorker();
      logger.info('Certificate worker started in-process (RUN_WORKER_INLINE=true)');
    }
  })
  .catch((err) => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}`, { stack: err.stack });
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');

  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });

  // Safety net: server.close()'s callback only fires once every open
  // connection drains, and won't fire at all if some other handle (e.g. a
  // still-pending initial MongoDB connection attempt) is keeping the event
  // loop alive. Force-exit after a grace period so the process can never
  // hang indefinitely on SIGTERM - important for PM2/Docker/k8s, which all
  // expect a bounded shutdown time before escalating to SIGKILL.
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s - forcing exit.');
    process.exit(1);
  }, 10000).unref();
});

module.exports = server;
