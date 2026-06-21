const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

mongoose.connection.on('connected', () => logger.info('Mongoose connected to MongoDB'));
mongoose.connection.on('error', (err) => logger.error(`Mongoose connection error: ${err.message}`));
mongoose.connection.on('disconnected', () => logger.warn('Mongoose disconnected from MongoDB'));

/**
 * Connects to MongoDB. A replica set (or MongoDB Atlas cluster, which is always
 * a replica set) is required in production because Order/User settlement and
 * quiz/certificate writes rely on multi-document ACID transactions.
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  return mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
}

module.exports = connectDB;
