const Order = require('../models/Order.model');
const catchAsync = require('../utils/catchAsync');

/** GET /api/v1/orders/my-orders - the authenticated student's own billing history. */
exports.getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { orders } });
});
