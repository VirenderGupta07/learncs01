const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(userId) {
  return jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

/**
 * Issues a JWT, sets it as a secure httpOnly cookie, and writes the standard
 * auth response body. Cookie-based delivery means the token is never
 * touchable by client-side JS, which is the baseline requirement for the
 * "simple, high-security email auth" spec.
 */
function sendTokenCookie(user, statusCode, res) {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + env.JWT_COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
}

module.exports = { signToken, sendTokenCookie };
