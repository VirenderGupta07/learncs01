const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../src/models/User.model');
const Course = require('../src/models/Course.model');
const Coupon = require('../src/models/Coupon.model');
const Cart = require('../src/models/Cart.model');

test('User.comparePassword', async (t) => {
  await t.test('returns true for the correct password', async () => {
    const hash = await bcrypt.hash('correct-horse-battery-staple', 12);
    const user = new User({ name: 'Test', email: 'test@example.com', password: hash });
    user.password = hash; // bypass the pre-save hashing hook - we're testing comparePassword in isolation
    assert.equal(await user.comparePassword('correct-horse-battery-staple'), true);
  });

  await t.test('returns false for the wrong password', async () => {
    const hash = await bcrypt.hash('correct-horse-battery-staple', 12);
    const user = new User({ name: 'Test', email: 'test@example.com', password: hash });
    user.password = hash;
    assert.equal(await user.comparePassword('wrong-password'), false);
  });
});

test('User.changedPasswordAfter', () => {
  const unset = new User({ name: 'T', email: 'a@example.com', password: 'x'.repeat(8) });
  assert.equal(unset.changedPasswordAfter(Math.floor(Date.now() / 1000)), false);

  const changedRecently = new User({ name: 'T', email: 'b@example.com', password: 'x'.repeat(8) });
  changedRecently.passwordChangedAt = new Date();
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  assert.equal(changedRecently.changedPasswordAfter(fiveMinutesAgo), true, 'a JWT older than the change should be rejected');

  const changedBeforeToken = new User({ name: 'T', email: 'c@example.com', password: 'x'.repeat(8) });
  changedBeforeToken.passwordChangedAt = new Date(Date.now() - 300000);
  assert.equal(
    changedBeforeToken.changedPasswordAfter(Math.floor(Date.now() / 1000)),
    false,
    'a JWT newer than the change should be accepted'
  );
});

test('User.createPasswordResetToken sets a sha256-hashed token and a ~10 minute expiry', () => {
  const user = new User({ name: 'T', email: 'd@example.com', password: 'x'.repeat(8) });
  const rawToken = user.createPasswordResetToken();
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.equal(user.passwordResetToken, expectedHash);
  assert.ok(user.passwordResetExpires > Date.now());
  assert.ok(user.passwordResetExpires <= Date.now() + 10 * 60 * 1000 + 1000);
});

test('User schema validation', () => {
  const badEmail = new User({ name: 'T', email: 'not-an-email', password: 'x'.repeat(8) });
  assert.ok(badEmail.validateSync().errors.email);

  const badRole = new User({ name: 'T', email: 'ok@example.com', password: 'x'.repeat(8), role: 'superuser' });
  assert.ok(badRole.validateSync().errors.role);
});

test('Admin permissions default to all-false (least privilege)', () => {
  const admin = new User({ name: 'Admin', email: 'admin@example.com', password: 'x'.repeat(8), role: 'admin' });
  assert.equal(admin.permissions.manageVideos, false);
  assert.equal(admin.permissions.manageCoupons, false);
  assert.equal(admin.isSuperAdmin, false);
});

function buildCourseWithQuiz() {
  return new Course({
    title: 'Intro to Algorithms',
    description: 'A course',
    category: 'Computer Science',
    price: 49,
    instructor: '000000000000000000000000',
    quiz: {
      title: 'Final',
      passPercentage: 70,
      questions: [
        { questionText: 'What is 2+2?', options: ['3', '4', '5'], correctOptionIndex: 1, points: 1 },
        { questionText: 'Capital of France?', options: ['Berlin', 'Paris'], correctOptionIndex: 1, points: 1 },
      ],
    },
  });
}

test('Course.getQuizForStudent strips correctOptionIndex from every question', () => {
  const studentQuiz = buildCourseWithQuiz().getQuizForStudent();
  assert.equal(studentQuiz.questions.length, 2);
  for (const q of studentQuiz.questions) {
    assert.equal('correctOptionIndex' in q, false);
    assert.ok(Array.isArray(q.options));
  }
});

test('correctOptionIndex is select:false at the schema level', () => {
  const path = Course.schema.path('quiz').schema.path('questions').schema.path('correctOptionIndex');
  assert.ok(path);
  assert.equal(path.options.select, false);
});

test('Course schema validation', () => {
  const badCategory = new Course({
    title: 'X',
    description: 'Y',
    category: 'Underwater Basket Weaving',
    price: 10,
    instructor: '000000000000000000000000',
  });
  assert.ok(badCategory.validateSync().errors.category);

  const tooFewOptions = new Course({
    title: 'X',
    description: 'Y',
    category: 'Programming',
    price: 10,
    instructor: '000000000000000000000000',
    quiz: { questions: [{ questionText: 'Q', options: ['only one'], correctOptionIndex: 0 }] },
  });
  assert.ok(tooFewOptions.validateSync());

  const badVideoSource = new Course({
    title: 'X',
    description: 'Y',
    category: 'Programming',
    price: 10,
    instructor: '000000000000000000000000',
    modules: [{ title: 'M1', lectures: [{ title: 'L1', videoSource: 'vimeo' }] }],
  });
  assert.ok(badVideoSource.validateSync());
});

function buildCoupon(overrides = {}) {
  return new Coupon({
    code: 'SAVE20',
    discountType: 'percentage',
    discountValue: 20,
    isActive: true,
    usedCount: 0,
    perUserLimit: 1,
    minOrderAmount: 0,
    applicableCourses: [],
    createdBy: '000000000000000000000000',
    ...overrides,
  });
}

test('Coupon.isValidForOrder', () => {
  assert.equal(buildCoupon().isValidForOrder(100, ['courseA']).valid, true);
  assert.equal(buildCoupon({ isActive: false }).isValidForOrder(100, ['courseA']).valid, false);
  assert.equal(
    buildCoupon({ expiresAt: new Date(Date.now() - 86400000) }).isValidForOrder(100, ['courseA']).valid,
    false
  );
  assert.equal(buildCoupon({ maxUses: 5, usedCount: 5 }).isValidForOrder(100, ['courseA']).valid, false);
  assert.equal(buildCoupon({ maxUses: 5, usedCount: 4 }).isValidForOrder(100, ['courseA']).valid, true);
  assert.equal(buildCoupon({ minOrderAmount: 50 }).isValidForOrder(20, ['courseA']).valid, false);
  assert.equal(
    buildCoupon({ applicableCourses: ['111111111111111111111111'] }).isValidForOrder(100, [
      '222222222222222222222222',
    ]).valid,
    false
  );
  assert.equal(
    buildCoupon({ applicableCourses: ['111111111111111111111111'] }).isValidForOrder(100, [
      '111111111111111111111111',
    ]).valid,
    true
  );
});

test('Cart.calculateSubtotal', () => {
  const cart = new Cart({
    user: '000000000000000000000000',
    items: [
      { course: '111111111111111111111111', priceAtAddition: 49.99 },
      { course: '222222222222222222222222', priceAtAddition: 29.5 },
    ],
  });
  assert.equal(Math.round(cart.calculateSubtotal() * 100) / 100, 79.49);
  assert.equal(new Cart({ user: '000000000000000000000000', items: [] }).calculateSubtotal(), 0);
});
