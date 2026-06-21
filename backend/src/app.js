const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { globalErrorHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const ApiError = require('./utils/ApiError');

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.CLIENT_URLS,
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());

if (env.NODE_ENV !== 'test') {
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

/**
 * Stripe webhook signature verification requires the exact raw request
 * bytes, so that single route must be excluded from the global JSON parser
 * (once a body is parsed/consumed, the raw bytes are gone). Every other
 * route gets normal JSON parsing.
 */
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/webhooks/stripe') {
    return express.raw({ type: 'application/json' })(req, res, next);
  }
  return express.json({ limit: '10kb' })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

app.use('/api/v1', apiLimiter);
app.use('/api/v1', routes);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

app.all('*', (req, res, next) => {
  next(new ApiError(`Route ${req.originalUrl} not found on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
