/**
 * Seeds the database with one demo account per role plus a sample course,
 * so a fresh deployment is immediately testable without manually creating
 * accounts or content first.
 *
 * Usage:
 *   npm run seed            (uses MONGO_URI from your environment/.env)
 *
 * Safe to run more than once: existing demo accounts have their password
 * and permissions reset to the documented values below (so credentials
 * always work exactly as printed, even if someone changed them while
 * testing); the demo course/coupon are only created if they don't already
 * exist (no duplicates on repeat runs).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../config/logger');

const User = require('../models/User.model');
const Course = require('../models/Course.model');
const Coupon = require('../models/Coupon.model');

const { DEMO_PASSWORD, DEMO_COURSE, DEMO_COUPON } = require('./seedData');

/** Creates a demo account if it doesn't exist, or resets it to the documented credentials if it does. */
async function upsertDemoUser({ email, name, role, password, isSuperAdmin = false, permissions = {}, bio }) {
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({ email, name, role, isSuperAdmin, bio });
  }

  user.name = name;
  user.role = role;
  user.isSuperAdmin = isSuperAdmin;
  user.bio = bio;
  user.isActive = true;
  user.isEmailVerified = true;
  user.mustChangePassword = false;
  user.password = password; // re-hashed by the pre-save hook

  if (role === 'admin' && !isSuperAdmin) {
    user.permissions = { ...user.permissions.toObject(), ...permissions };
  }

  await user.save();
  return user;
}

async function seed() {
  await connectDB();
  logger.info('Connected to MongoDB - seeding demo data...');

  // ---- Users: one per role -------------------------------------------------
  const superAdmin = await upsertDemoUser({
    email: 'superadmin@learncs01.com',
    name: 'Super Admin',
    role: 'admin',
    isSuperAdmin: true,
    password: DEMO_PASSWORD.superAdmin,
  });

  // A non-super admin with only SOME permissions granted, to demonstrate the
  // granular permission system (see User.model.js / hasPermission middleware).
  // This account can manage courses/videos/coupons/instructors, but NOT
  // staff permissions, users, analytics, certificates, chat moderation, or
  // orders - log in as this account and as superadmin to see the admin
  // dashboard nav differ accordingly.
  const admin = await upsertDemoUser({
    email: 'admin@learncs01.com',
    name: 'Content Admin',
    role: 'admin',
    password: DEMO_PASSWORD.admin,
    permissions: {
      manageCourses: true,
      manageVideos: true,
      manageCoupons: true,
      manageInstructors: true,
    },
  });
  logger.info(`Admin account ready: ${admin.email}`);

  const instructor = await upsertDemoUser({
    email: 'instructor@learncs01.com',
    name: 'Grace Hopper',
    role: 'instructor',
    bio: 'Demo instructor account for testing course authoring.',
    password: DEMO_PASSWORD.instructor,
  });

  const student = await upsertDemoUser({
    email: 'student@learncs01.com',
    name: 'Ada Lovelace',
    role: 'student',
    password: DEMO_PASSWORD.student,
  });

  logger.info('Demo users ready: super admin, admin, instructor, student');

  // ---- A demo course, already published, with a real YouTube lecture and a quiz ----
  let course = await Course.findOne({ slug: { $regex: '^intro-to-python-' } });

  if (!course) {
    course = await Course.create({
      ...DEMO_COURSE,
      instructor: instructor._id,
      createdBy: superAdmin._id,
      modules: DEMO_COURSE.modules.map((m) => ({
        ...m,
        lectures: m.lectures.map((l) => ({ ...l, addedBy: instructor._id })),
      })),
    });

    logger.info(`Demo course created: "${course.title}" (${course.slug})`);
  } else {
    logger.info(`Demo course already exists: "${course.title}" (${course.slug}) - skipping creation`);
  }

  // Pre-grant the demo student access to the demo course, bypassing the
  // payment flow entirely - this lets a tester exercise the course player,
  // quiz, and certificate generation without needing real Stripe/SSLCommerz
  // credentials configured. (See DEPLOYMENT.md for what does need real
  // credentials: the purchase flow itself, and S3 for certificate storage.)
  const alreadyOwned = student.purchasedCourses.some((entry) => entry.course.toString() === course._id.toString());
  if (!alreadyOwned) {
    student.purchasedCourses.push({ course: course._id, purchasedAt: new Date() });
    await student.save();
    logger.info(`Granted "${student.email}" access to the demo course (no payment required)`);
  }

  // ---- A demo coupon, for testing the purchase flow if real gateway keys are configured ----
  const existingCoupon = await Coupon.findOne({ code: DEMO_COUPON.code });
  if (!existingCoupon) {
    await Coupon.create({ ...DEMO_COUPON, createdBy: superAdmin._id });
    logger.info(`Demo coupon created: ${DEMO_COUPON.code} (${DEMO_COUPON.discountValue}% off)`);
  }

  // ---- Summary ----
  const summary = `
${'='.repeat(72)}
  LearnCS01 demo data ready. Log in with any of the following:
${'='.repeat(72)}

  SUPER ADMIN  (all permissions, manages staff)
    email:    superadmin@learncs01.com
    password: ${DEMO_PASSWORD.superAdmin}

  ADMIN  (limited permissions: courses, videos, coupons, instructors)
    email:    admin@learncs01.com
    password: ${DEMO_PASSWORD.admin}

  INSTRUCTOR
    email:    instructor@learncs01.com
    password: ${DEMO_PASSWORD.instructor}

  STUDENT  (already owns "Intro to Python" - no payment needed to test
            the course player, quiz, and certificate flow)
    email:    student@learncs01.com
    password: ${DEMO_PASSWORD.student}

  Demo coupon code: ${DEMO_COUPON.code} (${DEMO_COUPON.discountValue}% off, requires real
  Stripe/SSLCommerz keys configured to actually complete a purchase)

${'='.repeat(72)}
`;

  // Intentionally a plain console.log (not the structured logger) so the
  // credentials table prints cleanly and is easy to copy from a CI/Render
  // deploy log.
  // eslint-disable-next-line no-console
  console.log(summary);
}

seed()
  .then(() => mongoose.connection.close())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`Seed script failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
