const env = require('./env');

module.exports = {
  storeId: env.SSLCOMMERZ_STORE_ID,
  storePassword: env.SSLCOMMERZ_STORE_PASSWORD,
  isLive: env.SSLCOMMERZ_IS_LIVE,

  initUrl: env.SSLCOMMERZ_IS_LIVE
    ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',

  validationUrl: env.SSLCOMMERZ_IS_LIVE
    ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',

  // NOTE: Treat this as defense-in-depth, NOT the sole guard. SSLCommerz IPN
  // source IPs should be confirmed from current SSLCommerz merchant docs/support
  // and kept in this env var. The real authority check is the server-to-server
  // val_id validation call performed in services/sslcommerzPayment.service.js,
  // which is mandatory and always runs regardless of IP allowlist state.
  allowedIPs: env.SSLCOMMERZ_ALLOWED_IPS,
};
