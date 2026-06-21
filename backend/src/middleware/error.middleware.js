const logger = require('../config/logger');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function handleCastError(err) {
  return new ApiError(`Invalid value for ${err.path}: ${err.value}`, 400);
}

function handleDuplicateFieldError(err) {
  const field = Object.keys(err.keyValue || {})[0];
  return new ApiError(`Duplicate value for field '${field}'. Please use another value.`, 409);
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new ApiError(`Invalid input data: ${messages.join('. ')}`, 400);
}

function handleJWTError() {
  return new ApiError('Invalid authentication token. Please log in again.', 401);
}

function handleJWTExpiredError() {
  return new ApiError('Your session has expired. Please log in again.', 401);
}

exports.globalErrorHandler = (err, req, res, next) => {
  let error = err;
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateFieldError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.message}`);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.isOperational ? error.message : 'Something went wrong. Please try again later.',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
