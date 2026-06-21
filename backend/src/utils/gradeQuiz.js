/**
 * Grades a set of submitted answers against a course's quiz questions.
 * Pure function - no DB/network access - so it's directly unit-testable and
 * reusable wherever quiz results need to be computed.
 *
 * @param {Array} questions - quiz.questions, each with _id, correctOptionIndex, points
 * @param {Array} answers - [{ questionId, selectedOptionIndex }]
 * @param {number} passPercentage - the course's pass threshold (0-100)
 * @returns {{ scorePercentage: number, passed: boolean, breakdown: Array }}
 */
function gradeQuiz(questions, answers, passPercentage = 70) {
  let earnedPoints = 0;
  let totalPoints = 0;
  const breakdown = [];

  for (const question of questions) {
    const weight = question.points || 1;
    totalPoints += weight;

    const submitted = answers.find((a) => a.questionId === question._id.toString());
    const isCorrect = !!submitted && submitted.selectedOptionIndex === question.correctOptionIndex;
    if (isCorrect) earnedPoints += weight;

    // Never include the correct index itself - this breakdown is returned to the client.
    breakdown.push({ questionId: question._id, isCorrect });
  }

  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = scorePercentage >= passPercentage;

  return { scorePercentage, passed, breakdown };
}

module.exports = { gradeQuiz };
