require('dotenv').config();

function required(key, fallbackForNonProd) {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return fallbackForNonProd;
  }
  return value;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  // Render automatically injects RENDER_EXTERNAL_URL (e.g. https://my-api.onrender.com)
  // for web services - falling back to it means a Render deployment needs no
  // manually-configured API_PUBLIC_URL at all. Falls back further to a
  // localhost default for local development.
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
  CLIENT_URLS: (process.env.CLIENT_URLS || 'http://localhost:5173').split(',').map((s) => s.trim()),

  // When true, the API process also starts the certificate-generation
  // worker in-process (see jobs/certificateWorkerCore.js) instead of
  // requiring a separate always-on worker service. This exists specifically
  // because some free hosting tiers (e.g. Render's Hobby plan) offer a free
  // Web Service but not a free Background Worker instance type - see
  // DEPLOYMENT.md. For a real production deployment with a dedicated worker
  // service, leave this unset/false and run `npm run worker` separately.
  RUN_WORKER_INLINE: process.env.RUN_WORKER_INLINE === 'true',

  MONGO_URI: required('MONGO_URI', 'mongodb://127.0.0.1:27017/learncs01'),

  // Use a safe fallback for local/dev deployments so the API can stillboot
  // until a real secret is provided in production environments.
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_COOKIE_EXPIRES_DAYS: Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID,
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD,
  SSLCOMMERZ_IS_LIVE: process.env.SSLCOMMERZ_IS_LIVE === 'true',
  SSLCOMMERZ_ALLOWED_IPS: (process.env.SSLCOMMERZ_ALLOWED_IPS || '').split(',').map((s) => s.trim()).filter(Boolean),

  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_CLOUDFRONT_DOMAIN: process.env.AWS_CLOUDFRONT_DOMAIN,

  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@learncs01.com',
};
