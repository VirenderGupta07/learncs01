const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const env = require('../config/env');
const User = require('../models/User.model');
const logger = require('../config/logger');

module.exports = async function socketAuth(socket, next) {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const parsed = cookie.parse(socket.handshake.headers.cookie);
      token = parsed.jwt;
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error('Invalid session'));
    }

    socket.user = user;
    next();
  } catch (err) {
    logger.error(`Socket auth failed: ${err.message}`);
    next(new Error('Authentication failed'));
  }
};
