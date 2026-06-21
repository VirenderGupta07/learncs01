const express = require('express');
const cartController = require('../controllers/cart.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('student'));

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.delete('/items/:courseId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
