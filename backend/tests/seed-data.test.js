const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const Course = require('../src/models/Course.model');
const Coupon = require('../src/models/Coupon.model');
const { DEMO_PASSWORD, DEMO_COURSE, DEMO_COUPON } = require('../src/scripts/seedData');

test('seed demo passwords all satisfy the User schema minimum length', () => {
  for (const [role, password] of Object.entries(DEMO_PASSWORD)) {
    assert.ok(password.length >= 8, `${role}'s demo password is shorter than the 8-character minimum`);
  }
});

test('seed demo course passes full Mongoose schema validation', () => {
  const course = new Course({
    ...DEMO_COURSE,
    instructor: '000000000000000000000000',
    createdBy: '000000000000000000000000',
    modules: DEMO_COURSE.modules.map((m) => ({
      ...m,
      lectures: m.lectures.map((l) => ({ ...l, addedBy: '000000000000000000000000' })),
    })),
  });

  const error = course.validateSync();
  assert.equal(error, undefined, error ? JSON.stringify(error.errors) : undefined);
});

test('every quiz question in the seed course has a correctOptionIndex within bounds of its options', () => {
  for (const question of DEMO_COURSE.quiz.questions) {
    assert.ok(
      question.correctOptionIndex >= 0 && question.correctOptionIndex < question.options.length,
      `correctOptionIndex out of bounds for question "${question.questionText}"`
    );
  }
});

test('the seed course is published and has at least one preview-able lecture', () => {
  assert.equal(DEMO_COURSE.isPublished, true);
  const hasPreview = DEMO_COURSE.modules.some((m) => m.lectures.some((l) => l.isPreview));
  assert.ok(hasPreview, 'expected at least one lecture marked isPreview so anonymous visitors can watch it');
});

test('the seed lecture YouTube ID matches the expected 11-character format', () => {
  const { extractYoutubeId } = require('../src/utils/extractYoutubeId');
  const youtubeId = DEMO_COURSE.modules[0].lectures[0].youtubeVideoId;
  assert.equal(extractYoutubeId(youtubeId), youtubeId);
});

test('seed demo coupon passes full Mongoose schema validation', () => {
  const coupon = new Coupon({ ...DEMO_COUPON, createdBy: '000000000000000000000000' });
  const error = coupon.validateSync();
  assert.equal(error, undefined, error ? JSON.stringify(error.errors) : undefined);
});

test('seed demo coupon discount is a sane percentage (0-100)', () => {
  assert.ok(DEMO_COUPON.discountValue > 0 && DEMO_COUPON.discountValue <= 100);
});
