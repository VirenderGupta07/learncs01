const express = require('express');
const courseController = require('../controllers/course.controller');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', optionalAuth, courseController.getAllCourses);
router.get('/lectures/:lectureId/playback-url', optionalAuth, courseController.getLecturePlaybackUrl);
router.get('/by-id/:id', protect, courseController.getCourseById);
router.get('/:slug', optionalAuth, courseController.getCourseBySlug);

router.post('/', protect, restrictTo('instructor', 'admin'), courseController.createCourse);
router.patch('/:id', protect, restrictTo('instructor', 'admin'), courseController.updateCourse);
router.delete('/:id', protect, restrictTo('instructor', 'admin'), courseController.deleteCourse);
router.patch('/:id/publish', protect, restrictTo('instructor', 'admin'), courseController.publishCourse);

router.post('/:id/modules', protect, restrictTo('instructor', 'admin'), courseController.addModule);
router.post(
  '/:id/modules/:moduleId/lectures',
  protect,
  restrictTo('instructor', 'admin'),
  courseController.addLecture
);

module.exports = router;
