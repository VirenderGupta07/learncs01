const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(errors.array().map((e) => e.msg).join('. '), 400));
  }
  next();
};
