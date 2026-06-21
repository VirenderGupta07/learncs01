const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required'), body('password').notEmpty()],
  validateRequest,
  authController.login
);

router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

router.patch(
  '/update-password',
  protect,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validateRequest,
  authController.updatePassword
);

router.post('/forgot-password', authLimiter, authController.forgotPassword);

router.patch(
  '/reset-password/:token',
  [body('password').isLength({ min: 8 })],
  validateRequest,
  authController.resetPassword
);

module.exports = router;
