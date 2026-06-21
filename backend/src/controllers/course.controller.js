const Course = require('../models/Course.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { generatePresignedViewUrl } = require('../services/s3Upload.service');

exports.getAllCourses = catchAsync(async (req, res) => {
  const { category, level, search, page = 1, limit = 12, mine } = req.query;

  let filter = { isPublished: true };

  // Instructors/admins viewing their own course list (including drafts).
  if (mine === 'true' && req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
    filter = req.user.role === 'instructor' ? { instructor: req.user._id } : {};
  }

  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .select('-modules -quiz')
      .populate('instructor', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Course.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: courses.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: { courses },
  });
});

exports.getCourseBySlug = catchAsync(async (req, res, next) => {
  const course = await Course.findOne({ slug: req.params.slug, isPublished: true }).populate(
    'instructor',
    'name avatar bio'
  );

  if (!course) {
    return next(new ApiError('Course not found', 404));
  }

  const ownsCourse = req.user
    ? req.user.purchasedCourses.some((entry) => entry.course.toString() === course._id.toString())
    : false;

  const courseData = course.toObject();

  // Non-owners only get preview lectures and never see the quiz answer key.
  if (!ownsCourse) {
    courseData.modules = courseData.modules.map((module) => ({
      ...module,
      lectures: module.lectures.map((lecture) => ({
        ...lecture,
        youtubeVideoId: lecture.isPreview ? lecture.youtubeVideoId : undefined,
        s3: lecture.isPreview ? lecture.s3 : undefined,
      })),
    }));
    courseData.quiz = course.getQuizForStudent ? course.getQuizForStudent() : undefined;
  }

  res.status(200).json({ status: 'success', data: { course: courseData, ownsCourse } });
});

/**
 * GET /api/v1/courses/by-id/:id
 *
 * Used by the authenticated "course player" view (post-purchase). Unlike
 * getCourseBySlug, this always requires real ownership - there is no
 * preview-only fallback here, since this route is meant for students who
 * already own the course.
 */
exports.getCourseById = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'name avatar bio');
  if (!course) {
    return next(new ApiError('Course not found', 404));
  }

  const ownsCourse = req.user.purchasedCourses.some(
    (entry) => entry.course.toString() === course._id.toString()
  );

  if (!ownsCourse) {
    return next(new ApiError('You must purchase this course to access it', 403));
  }

  res.status(200).json({ status: 'success', data: { course } });
});

exports.createCourse = catchAsync(async (req, res) => {
  const course = await Course.create({
    ...req.body,
    instructor: req.user.role === 'instructor' ? req.user._id : req.body.instructor,
    createdBy: req.user._id,
  });

  res.status(201).json({ status: 'success', data: { course } });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ApiError('Course not found', 404));

  const isOwner = course.instructor.toString() === req.user._id.toString();
  if (req.user.role === 'instructor' && !isOwner) {
    return next(new ApiError('You can only edit your own courses', 403));
  }

  // Video fields are deliberately excluded - they may only be changed through
  // the dedicated, permission-gated admin video-management endpoints.
  // eslint-disable-next-line no-unused-vars
  const { modules, ...safeUpdates } = req.body;
  Object.assign(course, safeUpdates, { lastModifiedBy: req.user._id });
  await course.save();

  res.status(200).json({ status: 'success', data: { course } });
});

exports.addModule = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ApiError('Course not found', 404));

  course.modules.push({ title: req.body.title, order: course.modules.length });
  await course.save();

  res.status(201).json({ status: 'success', data: { course } });
});

exports.addLecture = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ApiError('Course not found', 404));

  const courseModule = course.modules.id(req.params.moduleId);
  if (!courseModule) return next(new ApiError('Module not found', 404));

  courseModule.lectures.push({
    title: req.body.title,
    description: req.body.description,
    order: courseModule.lectures.length,
    isPreview: !!req.body.isPreview,
    addedBy: req.user._id,
    videoSource: 'youtube',
  });

  await course.save();

  res.status(201).json({
    status: 'success',
    message: 'Lecture created. Attach its video via the admin video-management endpoints.',
    data: { course },
  });
});

exports.publishCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { isPublished: req.body.isPublished, lastModifiedBy: req.user._id },
    { new: true }
  );
  if (!course) return next(new ApiError('Course not found', 404));
  res.status(200).json({ status: 'success', data: { course } });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ApiError('Course not found', 404));

  if (req.user.role === 'instructor' && course.instructor.toString() !== req.user._id.toString()) {
    return next(new ApiError('You can only delete your own courses', 403));
  }

  await course.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

/**
 * GET /api/v1/courses/lectures/:lectureId/playback-url
 *
 * Issues a short-lived signed S3 URL for an S3-hosted lecture video. Only
 * granted to users who own the parent course (via purchase) or where the
 * lecture is marked isPreview - mirrors the access rules already enforced
 * when the course document itself is served.
 */
exports.getLecturePlaybackUrl = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;

  const course = await Course.findOne({ 'modules.lectures._id': lectureId });
  if (!course) return next(new ApiError('Lecture not found', 404));

  let lecture = null;
  for (const courseModule of course.modules) {
    lecture = courseModule.lectures.id(lectureId);
    if (lecture) break;
  }

  if (!lecture || lecture.videoSource !== 's3' || lecture.s3?.status !== 'ready') {
    return next(new ApiError('Video is not available', 404));
  }

  const ownsCourse =
    req.user && req.user.purchasedCourses.some((entry) => entry.course.toString() === course._id.toString());

  if (!ownsCourse && !lecture.isPreview) {
    return next(new ApiError('You must purchase this course to watch this lecture', 403));
  }

  const url = await generatePresignedViewUrl({ key: lecture.s3.key });

  res.status(200).json({ status: 'success', data: { url } });
});
