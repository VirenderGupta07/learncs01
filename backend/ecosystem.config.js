/**
 * Production process manager config (pm2).
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *
 * The API runs in cluster mode across all available CPU cores - this is
 * the cheap, simple way to use a single multi-core VM/box to serve the
 * 500-5,000 daily active user range without needing a separate
 * orchestration layer yet. The certificate worker stays single-instance
 * fork mode (BullMQ's own `concurrency` option, set in
 * jobs/certificate.worker.js, handles parallelism within that one process).
 */
module.exports = {
  apps: [
    {
      name: 'learncs01-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
    },
    {
      name: 'learncs01-certificate-worker',
      script: 'src/jobs/certificate.worker.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
    },
  ],
};
