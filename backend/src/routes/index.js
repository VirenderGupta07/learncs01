const express = require('express');

const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const cartRoutes = require('./cart.routes');
const paymentRoutes = require('./payment.routes'); // mounted on /courses for :id/purchase and :id/verify-quiz
const orderRoutes = require('./order.routes');
const webhookRoutes = require('./webhook.routes');
const chatRoutes = require('./chat.routes');
const adminRoutes = require('./admin.routes');
const uploadRoutes = require('./upload.routes'); // mounted on /admin for video management

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/courses', paymentRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', uploadRoutes);

module.exports = router;
