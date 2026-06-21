import { useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function QuizAttempt({ quiz }) {
  const { courseId } = useParams();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function selectOption(questionId, selectedOptionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionIndex }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({
          questionId,
          selectedOptionIndex,
        })),
      };
      const { data } = await axiosClient.post(endpoints.courses.verifyQuiz(courseId), payload);
      setResult(data.data);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="mx-auto max-w-lg px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">{result.passed ? 'You passed! 🎉' : 'Not quite there yet'}</h1>
        <p className="mt-2 text-gray-600">
          Score: {result.scorePercentage}% (pass mark: {result.passThreshold}%)
        </p>
        {result.certificateStatus === 'processing' && (
          <p className="mt-4 text-sm text-gray-500">
            Your certificate is being generated and will appear in your dashboard shortly.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-xl font-semibold">{quiz.title}</h1>
      <div className="space-y-8">
        {quiz.questions.map((q) => (
          <fieldset key={q._id}>
            <legend className="font-medium">{q.questionText}</legend>
            <div className="mt-3 space-y-2">
              {q.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q._id}
                    checked={answers[q._id] === idx}
                    onChange={() => selectOption(q._id, idx)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length !== quiz.questions.length}
        className="mt-8 rounded-md bg-ink px-5 py-2.5 text-white disabled:opacity-50"
      >
        Submit quiz
      </button>
    </section>
  );
}
