const DEMO_PASSWORD = {
  superAdmin: 'SuperAdmin123!',
  admin: 'Admin123!',
  instructor: 'Instructor123!',
  student: 'Student123!',
};

const DEMO_COURSE = {
  title: 'Intro to Python',
  description:
    'A short, practical introduction to Python programming fundamentals - variables, control flow, functions, and basic data structures. This is demo content seeded for testing LearnCS01.',
  shortDescription: 'A practical first course in Python programming.',
  category: 'Programming',
  level: 'Beginner',
  price: 49,
  currency: 'USD',
  isPublished: true,
  requirements: ['No prior programming experience required', 'A computer with internet access'],
  learningOutcomes: [
    'Write and run basic Python scripts',
    'Use variables, conditionals, and loops',
    'Define and call functions',
  ],
  tags: ['python', 'programming', 'beginner'],
  modules: [
    {
      title: 'Getting Started',
      order: 0,
      lectures: [
        {
          title: 'Python Crash Course (full lecture)',
          description:
            'A freely available, well-known introductory Python lecture used here as demo lecture content.',
          order: 0,
          videoSource: 'youtube',
          // freeCodeCamp's well-known "Learn Python - Full Course for
          // Beginners" - a long-standing, freely embeddable public video,
          // used here purely as realistic demo content. Swap this any time
          // from Admin > Video Management if it ever becomes unavailable.
          youtubeVideoId: 'rfscVS0vtbw',
          isPreview: true, // watchable without purchasing
        },
      ],
    },
  ],
  quiz: {
    title: 'Intro to Python - Final Quiz',
    passPercentage: 70,
    questions: [
      {
        questionText: 'Which keyword defines a function in Python?',
        options: ['func', 'def', 'function', 'lambda'],
        correctOptionIndex: 1,
        points: 1,
      },
      {
        questionText: 'What does the following evaluate to: len([1, 2, 3])?',
        options: ['2', '3', '4', 'Error'],
        correctOptionIndex: 1,
        points: 1,
      },
      {
        questionText: 'Which of these is a mutable data type in Python?',
        options: ['tuple', 'str', 'list', 'int'],
        correctOptionIndex: 2,
        points: 1,
      },
    ],
  },
};

const DEMO_COUPON = {
  code: 'WELCOME20',
  description: '20% off any course - demo coupon',
  discountType: 'percentage',
  discountValue: 20,
  isActive: true,
};

module.exports = { DEMO_PASSWORD, DEMO_COURSE, DEMO_COUPON };
