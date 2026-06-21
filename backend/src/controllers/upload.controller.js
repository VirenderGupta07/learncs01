const { v4: uuidv4 } = require('uuid');
const Course = require('../models/Course.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const env = require('../config/env');
const { generatePresignedUploadUrl } = require('../services/s3Upload.service');
const { extractYoutubeId } = require('../utils/extractYoutubeId');

function findLecture(course, lectureId) {
  for (const courseModule of course.modules) {
    const lecture = courseModule.lectures.id(lectureId);
    if (lecture) return lecture;
  }
  return null;
}

/**
 * POST /api/v1/admin/courses/:courseId/lectures/:lectureId/video/presign
 *
 * Step 1 of the S3 video path: returns a short-lived presigned PUT URL so the
 * browser can upload the video file directly to S3 (large files never touch
 * our API servers). Marks the lecture's video as 'uploading' until confirmed.
 */
exports.requestVideoUploadUrl = catchAsync(async (req, res, next) => {
  const { courseId, lectureId } = req.params;
  const { fileName, contentType } = req.body;

  if (!contentType || !contentType.startsWith('video/')) {
    return next(new ApiError('contentType must be a valid video MIME type', 400));
  }

  const course = await Course.findById(courseId);
  if (!course) return next(new ApiError('Course not found', 404));

  const lecture = findLecture(course, lectureId);
  if (!lecture) return next(new ApiError('Lecture not found', 404));

  const key = `course-videos/${courseId}/${lectureId}/${uuidv4()}-${fileName}`;
  const uploadUrl = await generatePresignedUploadUrl({ key, contentType });

  lecture.videoSource = 's3';
  lecture.s3 = { key, bucket: env.AWS_S3_BUCKET, status: 'uploading' };
  lecture.youtubeVideoId = undefined;
  lecture.lastModifiedBy = req.user._id;
  await course.save();

  res.status(200).json({ status: 'success', data: { uploadUrl, key } });
});

/** Step 2 of the S3 path: client calls this once the direct browser->S3 upload completes. */
exports.confirmVideoUpload = catchAsync(async (req, res, next) => {
  const { courseId, lectureId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) return next(new ApiError('Course not found', 404));

  const lecture = findLecture(course, lectureId);
  if (!lecture || lecture.videoSource !== 's3' || !lecture.s3?.key) {
    return next(new ApiError('No pending S3 upload found for this lecture', 400));
  }

  lecture.s3.status = 'ready';
  lecture.lastModifiedBy = req.user._id;
  await course.save();

  res.status(200).json({ status: 'success', data: { lecture } });
});

/** YouTube path: a single call, since there's nothing to upload server-side - just store the parsed video ID. */
exports.attachYoutubeVideo = catchAsync(async (req, res, next) => {
  const { courseId, lectureId } = req.params;
  const { youtubeUrl } = req.body;

  const videoId = extractYoutubeId(youtubeUrl || '');
  if (!videoId) {
    return next(new ApiError('A valid YouTube URL or 11-character video ID is required', 400));
  }

  const course = await Course.findById(courseId);
  if (!course) return next(new ApiError('Course not found', 404));

  const lecture = findLecture(course, lectureId);
  if (!lecture) return next(new ApiError('Lecture not found', 404));

  lecture.videoSource = 'youtube';
  lecture.youtubeVideoId = videoId;
  lecture.s3 = undefined;
  lecture.lastModifiedBy = req.user._id;
  await course.save();

  res.status(200).json({ status: 'success', data: { lecture } });
});
