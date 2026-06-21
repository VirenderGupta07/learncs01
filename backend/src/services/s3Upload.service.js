const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const env = require('../config/env');

/** Used by the certificate worker to upload a finished PDF buffer directly. */
async function uploadBufferToS3({ buffer, key, contentType }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = env.AWS_CLOUDFRONT_DOMAIN
    ? `https://${env.AWS_CLOUDFRONT_DOMAIN}/${key}`
    : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return { url, key };
}

/**
 * Used by the admin video-upload flow: the browser uploads the video file
 * directly to S3 using this presigned URL, so large video files never pass
 * through our API servers.
 */
async function generatePresignedUploadUrl({ key, contentType, expiresInSeconds = 900 }) {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/** Used to generate a time-limited playback URL for private S3-hosted lecture videos. */
async function generatePresignedViewUrl({ key, expiresInSeconds = 3600 }) {
  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadBufferToS3, generatePresignedUploadUrl, generatePresignedViewUrl };
