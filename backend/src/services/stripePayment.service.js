const stripe = require('../config/stripe');
const env = require('../config/env');

async function createStripeCheckoutSession({ order, user, course }) {
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: (order.currency || 'usd').toLowerCase(),
          unit_amount: Math.round(order.totalAmount * 100),
          product_data: {
            name: course.title,
            description: course.shortDescription || undefined,
          },
        },
        quantity: 1,
      },
    ],
    // metadata.orderId is how the webhook locates and atomically settles the
    // correct Order document - never trust amounts/items from the client again.
    metadata: {
      orderId: order._id.toString(),
      userId: user._id.toString(),
      courseId: course._id.toString(),
    },
    success_url: `${env.CLIENT_URLS[0]}/payment/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URLS[0]}/payment/stripe/cancel`,
  });

  order.stripe = { ...order.stripe, checkoutSessionId: checkoutSession.id };
  await order.save();

  return checkoutSession;
}

module.exports = { createStripeCheckoutSession };
