const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

function extractToken(req) {
  if (req.cookies?.jwt && req.cookies.jwt !== 'loggedout') {
    return req.cookies.jwt;
  }
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

/** Requires a valid session. Attaches the authenticated user to req.user. */
exports.protect = catchAsync(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(new ApiError('You are not logged in. Please log in to access this resource.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError('Invalid or expired session. Please log in again.', 401));
  }

  const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!currentUser) {
    return next(new ApiError('The user belonging to this session no longer exists.', 401));
  }

  if (!currentUser.isActive) {
    return next(new ApiError('Your account has been deactivated. Please contact support.', 403));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new ApiError('Your password was changed recently. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

/** Attaches req.user if a valid session exists, but never blocks the request. */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.isActive && !currentUser.changedPasswordAfter(decoded.iat)) {
      req.user = currentUser;
    }
  } catch (err) {
    // Invalid/expired token on an optional route - proceed as anonymous.
  }

  next();
});

/** Restricts a route to one or more base roles: 'student' | 'instructor' | 'admin'. */
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError('You do not have permission to perform this action.', 403));
  }
  next();
};

/**
 * Restricts a route to admin-role users who hold at least one of the given
 * granular permissions. The Super Admin always passes. This is what powers
 * "admin allows/gives permission so other admin-dashboard users [see/do]
 * only what they've been granted" - e.g. hasPermission('manageVideos') gates
 * who can attach lecture videos without granting them coupon or staff control.
 */
exports.hasPermission = (...permissionKeys) => (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError('Admin dashboard access is required for this action.', 403));
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  const granted = permissionKeys.some((key) => req.user.permissions?.[key] === true);
  if (!granted) {
    return next(new ApiError('You do not have permission to perform this action.', 403));
  }

  next();
};
