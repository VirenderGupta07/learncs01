const crypto = require('crypto');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendTokenCookie } = require('../utils/generateToken');
const { sendEmail } = require('../services/email.service');
const env = require('../config/env');

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new ApiError('An account with this email already exists', 409));
  }

  const user = await User.create({ name, email, password, role: 'student' });

  sendTokenCookie(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError('Email and password are required', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError('Incorrect email or password', 401));
  }

  if (!user.isActive) {
    return next(new ApiError('Your account has been deactivated. Please contact support.', 403));
  }

  sendTokenCookie(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', data: { user: req.user } });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new ApiError('Your current password is incorrect', 401));
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  sendTokenCookie(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });

  // Always return the same response whether or not the account exists, to
  // avoid leaking which emails are registered.
  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${env.CLIENT_URLS[0]}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Your LearnCS01 password reset link',
        html: `<p>Reset your password using the link below. This link expires in 10 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ApiError('Failed to send the reset email. Please try again later.', 500));
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'If an account with that email exists, a reset link has been sent.',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenCookie(user, 200, res);
});
