const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const logger = require('../config/logger');
const Certificate = require('../models/Certificate.model');
const Notification = require('../models/Notification.model');
const { generateCertificatePDF } = require('../services/pdfCertificate.service');
const { uploadBufferToS3 } = require('../services/s3Upload.service');
const socketEmitter = require('../sockets/emitter');

/**
 * Creates and starts the BullMQ worker that consumes the
 * 'certificate-generation' queue. Assumes a MongoDB connection is already
 * established by the caller - this function deliberately does NOT call
 * connectDB() itself, so it's safe to invoke from a process that already
 * has its own connection (the API server, when running with
 * RUN_WORKER_INLINE=true) without opening a redundant second connection.
 */
function createCertificateWorker() {
  const worker = new Worker(
    'certificate-generation',
    async (job) => {
      const { certificateId } = job.data;

      const certificate = await Certificate.findById(certificateId).populate('user').populate('course');
      if (!certificate) {
        throw new Error(`Certificate ${certificateId} not found`);
      }

      const pdfBuffer = await generateCertificatePDF({
        studentName: certificate.user.name,
        courseTitle: certificate.course.title,
        score: certificate.score,
        issuedAt: certificate.issuedAt,
        certificateId: certificate.certificateId,
        verificationCode: certificate.verificationCode,
      });

      const s3Key = `certificates/${certificate.user._id}/${certificate.certificateId}.pdf`;
      const { url } = await uploadBufferToS3({
        buffer: pdfBuffer,
        key: s3Key,
        contentType: 'application/pdf',
      });

      certificate.pdfUrl = url;
      certificate.s3Key = s3Key;
      certificate.status = 'ready';
      await certificate.save();

      const notification = await Notification.create({
        recipient: certificate.user._id,
        type: 'certificate_ready',
        title: 'Your certificate is ready!',
        body: `Your certificate for "${certificate.course.title}" is ready to download.`,
        link: `/certificates/${certificate.certificateId}`,
      });

      socketEmitter.to(`user:${certificate.user._id}`).emit('notification:new', {
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        createdAt: notification.createdAt,
      });

      logger.info(`Certificate ${certificateId} generated and uploaded successfully`);
      return { pdfUrl: url };
    },
    { connection: redisConnection, concurrency: 3 }
  );

  worker.on('failed', async (job, err) => {
    logger.error(`Certificate job ${job?.id} failed: ${err.message}`);
    if (job && job.attemptsMade >= job.opts.attempts) {
      await Certificate.findByIdAndUpdate(job.data.certificateId, { status: 'failed' }).catch((e) =>
        logger.error(`Failed to mark certificate as failed: ${e.message}`)
      );
    }
  });

  return worker;
}

module.exports = { createCertificateWorker };
