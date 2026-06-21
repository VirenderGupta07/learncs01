const express = require('express');
const { body } = require('express-validator');
const uploadController = require('../controllers/upload.controller');
const { protect, restrictTo, hasPermission } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

// Every route below is admin-dashboard-only, and additionally requires the
// Super-Admin-granted 'manageVideos' (or broader 'manageCourses') permission.
// Instructors never hit these routes directly - they only create lecture
// metadata (course.routes.js); attaching/replacing the actual video is
// exclusively an admin-dashboard action.
router.use(protect, restrictTo('admin'), hasPermission('manageVideos', 'manageCourses'));

router.post(
  '/courses/:courseId/lectures/:lectureId/video/presign',
  [body('fileName').notEmpty(), body('contentType').notEmpty()],
  validateRequest,
  uploadController.requestVideoUploadUrl
);

router.patch('/courses/:courseId/lectures/:lectureId/video/confirm', uploadController.confirmVideoUpload);

router.patch(
  '/courses/:courseId/lectures/:lectureId/video/youtube',
  [body('youtubeUrl').notEmpty()],
  validateRequest,
  uploadController.attachYoutubeVideo
);

module.exports = router;
