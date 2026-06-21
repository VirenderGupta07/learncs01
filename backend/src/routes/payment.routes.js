const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const quizController = require('../controllers/quiz.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/:id/purchase',
  protect,
  restrictTo('student'),
  [body('gateway').isIn(['stripe', 'sslcommerz']).withMessage('gateway must be stripe or sslcommerz')],
  validateRequest,
  paymentController.purchaseCourse
);

router.post(
  '/:id/verify-quiz',
  protect,
  restrictTo('student'),
  [body('answers').isArray({ min: 1 }).withMessage('answers must be a non-empty array')],
  validateRequest,
  quizController.verifyQuiz
);

module.exports = router;
