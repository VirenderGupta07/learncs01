const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT) || 587,
  secure: Number(env.SMTP_PORT) === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    // Email failures should never crash a request/transaction that already
    // succeeded - log and move on.
    logger.error(`Failed to send email to ${to}: ${err.message}`);
  }
}

/** Sends an order-confirmation email after a webhook has settled an order as paid. */
async function enqueueWelcomeEmail(orderId) {
  const Order = require('../models/Order.model');
  const order = await Order.findById(orderId).populate('user');

  if (!order) return;

  const courseTitles = order.items.map((item) => item.title).join(', ');

  await sendEmail({
    to: order.user.email,
    subject: 'Your LearnCS01 purchase is confirmed',
    html: `<p>Hi ${order.user.name},</p><p>Your purchase of <strong>${courseTitles}</strong> is confirmed. You can start learning right away from your dashboard.</p><p>Order: ${order.orderNumber}</p>`,
  });
}

module.exports = { sendEmail, enqueueWelcomeEmail };
