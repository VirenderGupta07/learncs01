const express = require('express');
const orderController = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/my-orders', protect, restrictTo('student'), orderController.getMyOrders);

module.exports = router;
