const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// NOTE: the Stripe route body must arrive as a raw Buffer for signature
// verification to work - that exemption from the global JSON parser is
// configured in app.js, not here.
router.post('/stripe', webhookController.handleStripeWebhook);
router.post('/sslcommerz', webhookController.handleSSLCommerzWebhook);

module.exports = router;
