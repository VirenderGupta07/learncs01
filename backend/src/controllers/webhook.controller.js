const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const env = require('../config/env');
const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Coupon = require('../models/Coupon.model');
const { validateSSLCommerzTransaction, isRequestFromSSLCommerz } = require('../services/sslcommerzPayment.service');
const { enqueueWelcomeEmail } = require('../services/email.service');
const logger = require('../config/logger');

/**
 * POST /api/v1/webhooks/stripe
 *
 * Requires the RAW request body (configured in app.js) so the signature can
 * be cryptographically verified against STRIPE_WEBHOOK_SECRET before any of
 * the payload is trusted.
 */
exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const dataObject = event.data.object;
      const orderId = dataObject.metadata?.orderId;

      if (!orderId) {
        logger.warn(`Stripe event ${event.id} (${event.type}) missing orderId metadata - ignored`);
        return res.status(200).json({ received: true });
      }

      await settleOrderPaid({
        orderId,
        gateway: 'stripe',
        rawReference: {
          checkoutSessionId: dataObject.id?.startsWith('cs_') ? dataObject.id : undefined,
          paymentIntentId: dataObject.payment_intent || (dataObject.id?.startsWith('pi_') ? dataObject.id : undefined),
        },
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      const dataObject = event.data.object;
      const orderId = dataObject.metadata?.orderId;
      if (orderId) {
        await settleOrderFailed({
          orderId,
          reason: dataObject.last_payment_error?.message || 'Payment failed',
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`Stripe webhook processing error: ${err.message}`);
    // Returning 500 tells Stripe to retry delivery.
    return res.status(500).json({ received: false });
  }
};

/**
 * POST /api/v1/webhooks/sslcommerz
 *
 * Two layers of trust verification, both required:
 *  1. Source-IP allowlist check (defense-in-depth, configurable in env).
 *  2. Mandatory server-to-server val_id validation call against SSLCommerz's
 *     own validator API - this is the real authority on whether payment
 *     actually succeeded, since IPN bodies can otherwise be spoofed.
 */
exports.handleSSLCommerzWebhook = async (req, res) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const requestIp = (forwardedFor ? forwardedFor.split(',')[0] : req.socket.remoteAddress || '').trim();

  if (!isRequestFromSSLCommerz(requestIp)) {
    logger.error(`Rejected SSLCommerz IPN from untrusted IP: ${requestIp}`);
    return res.status(403).json({ received: false, reason: 'Untrusted source IP' });
  }

  const { tran_id: tranId, val_id: valId, status } = req.body;

  if (!tranId || !valId) {
    return res.status(400).json({ received: false, reason: 'Missing transaction identifiers' });
  }

  try {
    if (status !== 'VALID' && status !== 'VALIDATED') {
      await settleOrderFailed({ tranId, reason: `SSLCommerz reported status: ${status}` });
      return res.status(200).json({ received: true });
    }

    const validation = await validateSSLCommerzTransaction(valId);

    if (!validation || (validation.status !== 'VALID' && validation.status !== 'VALIDATED')) {
      logger.error(`SSLCommerz server-side validation failed for tran_id ${tranId}`);
      await settleOrderFailed({ tranId, reason: 'Server-side validation failed' });
      return res.status(200).json({ received: true });
    }

    const order = await Order.findOne({ 'sslcommerz.tranId': tranId });
    if (!order) {
      logger.error(`SSLCommerz IPN for unknown tran_id ${tranId}`);
      return res.status(200).json({ received: true });
    }

    if (Number(validation.amount) < order.totalAmount - 0.01) {
      logger.error(
        `SSLCommerz amount mismatch for order ${order._id}: expected ${order.totalAmount}, received ${validation.amount}`
      );
      await settleOrderFailed({ orderId: order._id, reason: 'Amount mismatch detected during validation' });
      return res.status(200).json({ received: true });
    }

    await settleOrderPaid({
      orderId: order._id,
      gateway: 'sslcommerz',
      rawReference: { tranId, valId, bankTranId: validation.bank_tran_id },
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`SSLCommerz webhook processing error: ${err.message}`);
    return res.status(500).json({ received: false });
  }
};

/**
 * Atomically settles an order as paid: updates Order, grants course access
 * on User, and applies coupon usage - all inside one MongoDB transaction so
 * a partial failure can never leave a paid order without granted access (or
 * vice versa). Idempotent: a duplicate webhook delivery for an
 * already-paid order is a safe no-op.
 */
async function settleOrderPaid({ orderId, gateway, rawReference }) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new Error(`Order ${orderId} not found during settlement`);
      }

      if (order.paymentStatus === 'paid') {
        logger.warn(`Duplicate webhook delivery ignored for already-paid order ${orderId}`);
        return;
      }

      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.paymentGateway = gateway;

      if (gateway === 'stripe') {
        order.stripe = { ...order.stripe, ...rawReference };
      } else {
        order.sslcommerz = { ...order.sslcommerz, ...rawReference };
      }

      await order.save({ session });

      const purchasedEntries = order.items.map((item) => ({
        course: item.course,
        order: order._id,
        purchasedAt: new Date(),
      }));

      await User.findByIdAndUpdate(
        order.user,
        { $push: { purchasedCourses: { $each: purchasedEntries } } },
        { session }
      );

      if (order.couponApplied?.code) {
        await Coupon.findOneAndUpdate(
          { code: order.couponApplied.code },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }
    });

    logger.info(`Order ${orderId} settled as PAID via ${gateway}`);

    enqueueWelcomeEmail(orderId).catch((err) =>
      logger.error(`Failed to send order confirmation email for ${orderId}: ${err.message}`)
    );
  } catch (err) {
    logger.error(`Failed to settle order ${orderId} as paid: ${err.message}`);
    throw err;
  } finally {
    session.endSession();
  }
}

async function settleOrderFailed({ orderId, tranId, reason }) {
  try {
    const query = orderId ? { _id: orderId } : { 'sslcommerz.tranId': tranId };
    await Order.findOneAndUpdate(query, { paymentStatus: 'failed', failureReason: reason });
    logger.info(`Order ${orderId || tranId} marked as FAILED: ${reason}`);
  } catch (err) {
    logger.error(`Failed to mark order as failed: ${err.message}`);
  }
}
