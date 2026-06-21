const test = require('node:test');
const assert = require('node:assert/strict');

const { gradeQuiz } = require('../src/utils/gradeQuiz');
const { calculateDiscount } = require('../src/utils/calculateDiscount');
const { extractYoutubeId } = require('../src/utils/extractYoutubeId');

test('gradeQuiz', async (t) => {
  await t.test('all correct answers scores 100% and passes', () => {
    const questions = [
      { _id: 'q1', correctOptionIndex: 1, points: 1 },
      { _id: 'q2', correctOptionIndex: 0, points: 1 },
    ];
    const answers = [
      { questionId: 'q1', selectedOptionIndex: 1 },
      { questionId: 'q2', selectedOptionIndex: 0 },
    ];
    const result = gradeQuiz(questions, answers, 70);
    assert.equal(result.scorePercentage, 100);
    assert.equal(result.passed, true);
  });

  await t.test('all wrong answers scores 0% and fails', () => {
    const questions = [
      { _id: 'q1', correctOptionIndex: 1, points: 1 },
      { _id: 'q2', correctOptionIndex: 0, points: 1 },
    ];
    const answers = [
      { questionId: 'q1', selectedOptionIndex: 0 },
      { questionId: 'q2', selectedOptionIndex: 1 },
    ];
    const result = gradeQuiz(questions, answers, 70);
    assert.equal(result.scorePercentage, 0);
    assert.equal(result.passed, false);
  });

  await t.test('weighted points: 2 of 3 points earned rounds to 67%', () => {
    const questions = [
      { _id: 'q1', correctOptionIndex: 1, points: 2 },
      { _id: 'q2', correctOptionIndex: 0, points: 1 },
    ];
    const answers = [
      { questionId: 'q1', selectedOptionIndex: 1 }, // correct, 2 pts
      { questionId: 'q2', selectedOptionIndex: 1 }, // wrong, 0 pts
    ];
    assert.equal(gradeQuiz(questions, answers, 70).scorePercentage, 67);
  });

  await t.test('a missing answer for a question counts as incorrect, not a crash', () => {
    const questions = [{ _id: 'q1', correctOptionIndex: 1, points: 1 }];
    assert.equal(gradeQuiz(questions, [], 70).scorePercentage, 0);
  });

  await t.test('breakdown never includes the correct option index', () => {
    const questions = [{ _id: 'q1', correctOptionIndex: 1, points: 1 }];
    const { breakdown } = gradeQuiz(questions, [{ questionId: 'q1', selectedOptionIndex: 1 }], 70);
    assert.equal('correctOptionIndex' in breakdown[0], false);
  });

  await t.test('a score exactly at the pass threshold passes', () => {
    const questions = [
      { _id: 'q1', correctOptionIndex: 0, points: 1 },
      { _id: 'q2', correctOptionIndex: 0, points: 1 },
      { _id: 'q3', correctOptionIndex: 0, points: 1 },
      { _id: 'q4', correctOptionIndex: 0, points: 1 },
      { _id: 'q5', correctOptionIndex: 0, points: 1 },
    ];
    // 4/5 = 80%, threshold 80
    const answers = [
      { questionId: 'q1', selectedOptionIndex: 0 },
      { questionId: 'q2', selectedOptionIndex: 0 },
      { questionId: 'q3', selectedOptionIndex: 0 },
      { questionId: 'q4', selectedOptionIndex: 0 },
      { questionId: 'q5', selectedOptionIndex: 1 },
    ];
    assert.equal(gradeQuiz(questions, answers, 80).passed, true);
  });
});

test('calculateDiscount', async (t) => {
  await t.test('20% off a $49 course', () => {
    const { totalAmount } = calculateDiscount(49, { discountType: 'percentage', discountValue: 20 });
    assert.equal(totalAmount, 39.2);
  });

  await t.test('flat $10 off a $49 course', () => {
    const { totalAmount } = calculateDiscount(49, { discountType: 'flat', discountValue: 10 });
    assert.equal(totalAmount, 39);
  });

  await t.test('a flat discount larger than the price never goes negative', () => {
    const { totalAmount } = calculateDiscount(20, { discountType: 'flat', discountValue: 999 });
    assert.equal(totalAmount, 0);
  });

  await t.test('100% off results in exactly 0, not a negative rounding artifact', () => {
    const { totalAmount } = calculateDiscount(49.99, { discountType: 'percentage', discountValue: 100 });
    assert.equal(totalAmount, 0);
  });
});

test('extractYoutubeId', async (t) => {
  await t.test('standard watch URL', () => {
    assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });
  await t.test('youtu.be short URL', () => {
    assert.equal(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });
  await t.test('embed URL', () => {
    assert.equal(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });
  await t.test('watch URL with extra query params', () => {
    assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'), 'dQw4w9WgXcQ');
  });
  await t.test('a bare 11-character ID is accepted directly', () => {
    assert.equal(extractYoutubeId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });
  await t.test('garbage input is rejected', () => {
    assert.equal(extractYoutubeId('not a url at all'), null);
  });
  await t.test('an unrelated video host is rejected', () => {
    assert.equal(extractYoutubeId('https://vimeo.com/12345'), null);
  });
  await t.test('non-string input is rejected, not thrown', () => {
    assert.equal(extractYoutubeId(undefined), null);
    assert.equal(extractYoutubeId(null), null);
  });
});
