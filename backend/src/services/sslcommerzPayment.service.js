const axios = require('axios');
const sslConfig = require('../config/sslcommerz');
const env = require('../config/env');

async function initSSLCommerzSession({ order, user, course }) {
  const tranId = order.orderNumber;

  const payload = {
    store_id: sslConfig.storeId,
    store_passwd: sslConfig.storePassword,
    total_amount: order.totalAmount,
    currency: order.currency === 'USD' ? 'USD' : 'BDT',
    tran_id: tranId,
    success_url: `${env.CLIENT_URLS[0]}/payment/sslcommerz/success`,
    fail_url: `${env.CLIENT_URLS[0]}/payment/sslcommerz/fail`,
    cancel_url: `${env.CLIENT_URLS[0]}/payment/sslcommerz/cancel`,
    ipn_url: `${env.API_PUBLIC_URL}/api/v1/webhooks/sslcommerz`,
    shipping_method: 'NO',
    product_name: course.title,
    product_category: 'Online Course',
    product_profile: 'general',
    cus_name: user.name,
    cus_email: user.email,
    cus_add1: 'N/A',
    cus_city: 'N/A',
    cus_postcode: '0000',
    cus_country: 'Bangladesh',
    cus_phone: user.phone || '00000000000',
  };

  const response = await axios.post(sslConfig.initUrl, new URLSearchParams(payload).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  if (!response.data || response.data.status !== 'SUCCESS') {
    throw new Error(`SSLCommerz session init failed: ${response.data?.failedreason || 'Unknown error'}`);
  }

  order.sslcommerz = { ...order.sslcommerz, tranId };
  await order.save();

  return response.data;
}

/**
 * SSLCommerz IPN payloads can be spoofed by anyone who knows the endpoint URL,
 * so the IP allowlist check alone is NOT sufficient authentication. This call
 * re-validates the transaction directly against SSLCommerz's own servers using
 * the val_id from the IPN, store credentials, and amount - this is the real
 * trust boundary for marking an order paid.
 */
async function validateSSLCommerzTransaction(valId) {
  const response = await axios.get(sslConfig.validationUrl, {
    params: {
      val_id: valId,
      store_id: sslConfig.storeId,
      store_passwd: sslConfig.storePassword,
      v: 1,
      format: 'json',
    },
    timeout: 15000,
  });

  return response.data;
}

function isRequestFromSSLCommerz(requestIp) {
  if (!sslConfig.allowedIPs || sslConfig.allowedIPs.length === 0) {
    // No allowlist configured: don't hard-fail in non-production environments
    // (sandbox testing), but this should always be populated before go-live.
    return env.NODE_ENV !== 'production';
  }
  return sslConfig.allowedIPs.includes(requestIp);
}

module.exports = { initSSLCommerzSession, validateSSLCommerzTransaction, isRequestFromSSLCommerz };
