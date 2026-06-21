const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Course = require('../models/Course.model');
const User = require('../models/User.model');
const Certificate = require('../models/Certificate.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const { certificateQueue } = require('../jobs/queues');
const { gradeQuiz } = require('../utils/gradeQuiz');

/**
 * POST /api/v1/courses/:id/verify-quiz
 * Body: { answers: [{ questionId, selectedOptionIndex }] }
 *
 * Grades entirely server-side against `quiz.questions.correctOptionIndex`,
 * which is select:false and therefore never exposed to the client elsewhere.
 * On a passing score (first time only), atomically issues a Certificate
 * record and enqueues a background job to render and store the PDF, so the
 * request thread is never blocked on PDF generation or S3 upload.
 */
exports.verifyQuiz = catchAsync(async (req, res, next) => {
  const { id: courseId } = req.params;
  const { answers } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return next(new ApiError('Quiz answers are required', 400));
  }

  const ownsCourse = req.user.purchasedCourses.some((entry) => entry.course.toString() === courseId);
  if (!ownsCourse) {
    return next(new ApiError('You must purchase this course before attempting the quiz', 403));
  }

  const course = await Course.findById(courseId).select('+quiz.questions.correctOptionIndex');
  if (!course || !course.quiz || course.quiz.questions.length === 0) {
    return next(new ApiError('No quiz is available for this course', 404));
  }

  const passThreshold = course.quiz.passPercentage || 70;
  const { scorePercentage, passed, breakdown } = gradeQuiz(course.quiz.questions, answers, passThreshold);

  const session = await mongoose.startSession();
  let certificate = null;

  try {
    await session.withTransaction(async () => {
      const userDoc = await User.findById(req.user._id).session(session);

      const existingProgress = userDoc.progress.get(courseId) || {
        completedLectures: [],
        quizAttempts: [],
        bestScore: 0,
        passed: false,
        certificateIssued: false,
      };

      existingProgress.quizAttempts.push({ score: scorePercentage, passed, attemptedAt: new Date() });
      existingProgress.bestScore = Math.max(existingProgress.bestScore || 0, scorePercentage);

      if (passed) {
        existingProgress.passed = true;
      }

      const shouldIssueCertificate = passed && !existingProgress.certificateIssued;

      if (shouldIssueCertificate) {
        const [createdCertificate] = await Certificate.create(
          [
            {
              user: req.user._id,
              course: course._id,
              certificateId: uuidv4(),
              verificationCode: uuidv4().split('-')[0].toUpperCase(),
              score: scorePercentage,
              status: 'processing',
              issuedAt: new Date(),
            },
          ],
          { session }
        );

        certificate = createdCertificate;
        existingProgress.certificateIssued = true;
        existingProgress.certificate = certificate._id;
      }

      userDoc.progress.set(courseId, existingProgress);
      await userDoc.save({ session });
    });
  } catch (err) {
    logger.error(
      `Quiz verification transaction failed for user ${req.user._id}, course ${courseId}: ${err.message}`
    );
    return next(new ApiError('Could not record your quiz result. Please try again.', 500));
  } finally {
    session.endSession();
  }

  if (certificate) {
    if (certificateQueue) {
      try {
        await certificateQueue.add(
          'generate-certificate',
          { certificateId: certificate._id.toString() },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
        );
      } catch (err) {
        // The DB state is already correct (status: 'processing'); a failed
        // enqueue here just means generation is delayed, not lost - log loudly
        // so ops can requeue manually if needed.
        logger.error(`Failed to enqueue certificate generation job for ${certificate._id}: ${err.message}`);
      }
    } else {
      logger.warn(`Certificate job was not enqueued because Redis is not configured for ${certificate._id}`);
    }
  }

  return res.status(200).json({
    status: 'success',
    data: {
      scorePercentage,
      passed,
      passThreshold,
      breakdown,
      certificateStatus: certificate ? 'processing' : passed ? 'already_issued' : 'not_applicable',
    },
  });
});
