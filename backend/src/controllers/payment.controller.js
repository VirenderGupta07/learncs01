const mongoose = require('mongoose');
const Course = require('../models/Course.model');
const Order = require('../models/Order.model');
const Coupon = require('../models/Coupon.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const { createStripeCheckoutSession } = require('../services/stripePayment.service');
const { initSSLCommerzSession } = require('../services/sslcommerzPayment.service');
const { calculateDiscount } = require('../utils/calculateDiscount');

/**
 * POST /api/v1/courses/:id/purchase
 *
 * Validates the course/coupon, atomically creates a 'pending' Order, then
 * initializes the chosen payment gateway and returns a redirect target.
 * The Order is only ever marked 'paid' later, inside the webhook handlers
 * (controllers/webhook.controller.js), which is the sole source of truth
 * for payment success - this route never grants course access itself.
 */
exports.purchaseCourse = catchAsync(async (req, res, next) => {
  const { id: courseId } = req.params;
  const { gateway, couponCode } = req.body;

  if (!['stripe', 'sslcommerz'].includes(gateway)) {
    return next(new ApiError('Invalid payment gateway specified', 400));
  }

  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    return next(new ApiError('Course not found or unavailable', 404));
  }

  const alreadyOwned = req.user.purchasedCourses.some(
    (entry) => entry.course.toString() === courseId
  );
  if (alreadyOwned) {
    return next(new ApiError('You already own this course', 400));
  }

  let discountAmount = 0;
  let totalAmount = course.price;
  let couponSnapshot;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) {
      return next(new ApiError('Invalid or expired coupon code', 400));
    }

    const validation = coupon.isValidForOrder(course.price, [courseId]);
    if (!validation.valid) {
      return next(new ApiError(validation.reason, 400));
    }

    ({ discountAmount, totalAmount } = calculateDiscount(course.price, coupon));

    // Usage is validated here but NOT incremented yet - usedCount only
    // increments once the webhook confirms real payment, so abandoned
    // checkouts never burn a customer's coupon redemption.
    couponSnapshot = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };
  }

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const [createdOrder] = await Order.create(
        [
          {
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            user: req.user._id,
            items: [
              {
                course: course._id,
                title: course.title,
                price: course.price,
                instructor: course.instructor,
              },
            ],
            subtotal: course.price,
            discountAmount,
            couponApplied: couponSnapshot,
            totalAmount,
            currency: course.currency || 'USD',
            paymentGateway: gateway,
            paymentStatus: 'pending',
            ipAddress: req.ip,
          },
        ],
        { session }
      );

      order = createdOrder;
    });
  } catch (err) {
    logger.error(`Order pre-creation transaction failed for user ${req.user._id}: ${err.message}`);
    return next(new ApiError('Unable to initialize your order. Please try again.', 500));
  } finally {
    session.endSession();
  }

  try {
    if (gateway === 'stripe') {
      const checkoutSession = await createStripeCheckoutSession({ order, user: req.user, course });
      return res.status(201).json({
        status: 'success',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id,
        },
      });
    }

    const sslSession = await initSSLCommerzSession({ order, user: req.user, course });
    return res.status(201).json({
      status: 'success',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        gatewayPageUrl: sslSession.GatewayPageURL,
      },
    });
  } catch (err) {
    order.paymentStatus = 'failed';
    order.failureReason = 'Gateway initialization failed';
    await order.save();
    logger.error(`Payment gateway init failed for order ${order._id}: ${err.message}`);
    return next(new ApiError('Could not connect to the payment gateway. Please try again.', 502));
  }
});
