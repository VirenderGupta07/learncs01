require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../config/logger');
const connectDB = require('../config/db');
const { createCertificateWorker } = require('./certificateWorkerCore');

// Unlike server.js (which must exit if it can't reach MongoDB before serving
// any traffic), this worker intentionally does NOT exit(1) on a failed
// initial connection - mongoose keeps retrying in the background (logged via
// the 'error'/'disconnected' listeners in config/db.js), which is the
// correct behavior for a long-running background process: a transient Mongo
// blip should self-heal, not require a process manager to keep restarting it.
connectDB().then(() => logger.info('Certificate worker connected to MongoDB'));

const worker = createCertificateWorker();

process.on('SIGTERM', async () => {
  logger.info('Certificate worker shutting down...');
  await worker.close();
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = worker;
