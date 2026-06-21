const mongoose = require('mongoose');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
  },
  { _id: false }
);

const s3VideoSchema = new mongoose.Schema(
  {
    key: String,
    bucket: String,
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'uploading',
    },
    durationSeconds: Number,
  },
  { _id: false }
);

/**
 * A lecture's video can come from one of two sources:
 *  - 'youtube': rendered client-side as a YouTube <iframe> embed (zero hosting cost)
 *  - 's3'     : uploaded directly to S3 via a presigned URL, served via CloudFront/signed URL
 *
 * Both paths are only ever written through the admin video-management endpoints
 * (see controllers/upload.controller.js), which are gated by the `manageVideos`
 * (or `manageCourses`) admin permission - instructors can create lecture metadata,
 * but cannot attach or change the underlying video themselves.
 */
const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  order: { type: Number, required: true, default: 0 },

  videoSource: { type: String, enum: ['youtube', 's3'], default: 'youtube' },
  youtubeVideoId: { type: String, trim: true },
  s3: s3VideoSchema,

  isPreview: { type: Boolean, default: false }, // playable without purchase
  resources: [resourceSchema],

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  order: { type: Number, required: true, default: 0 },
  lectures: [lectureSchema],
});

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 6,
      message: 'Each question must have between 2 and 6 options',
    },
    required: true,
  },
  // select: false -> never returned to the client by default. Only the
  // quiz-grading controller explicitly re-selects this field server-side.
  correctOptionIndex: {
    type: Number,
    required: true,
    select: false,
  },
  points: { type: Number, default: 1, min: 1 },
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Final Assessment' },
    passPercentage: { type: Number, default: 70, min: 0, max: 100 },
    questions: [questionSchema],
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Course title is required'], trim: true, maxlength: 150 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 250 },

    category: {
      type: String,
      enum: ['Programming', 'Computer Science'],
      required: true,
    },
    subCategory: { type: String, trim: true },

    thumbnail: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },

    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    language: { type: String, default: 'English' },

    modules: [moduleSchema],
    quiz: quizSchema,

    isPublished: { type: Boolean, default: false },

    ratingsAverage: { type: Number, default: 0, min: 0, max: 5, set: (val) => Math.round(val * 10) / 10 },
    ratingsQuantity: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },

    requirements: [String],
    learningOutcomes: [String],
    tags: [String],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, isPublished: 1 });
courseSchema.index({ instructor: 1 });

courseSchema.pre('save', function setSlug(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = `${slugify(this.title)}-${this._id.toString().slice(-6)}`;
  }
  next();
});

courseSchema.virtual('totalLecturesCount').get(function getTotalLectures() {
  return this.modules.reduce((sum, m) => sum + m.lectures.length, 0);
});

courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

/** Returns the quiz with correctOptionIndex stripped, safe to send to students. */
courseSchema.methods.getQuizForStudent = function getQuizForStudent() {
  if (!this.quiz) return null;
  return {
    title: this.quiz.title,
    passPercentage: this.quiz.passPercentage,
    questions: this.quiz.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      points: q.points,
    })),
  };
};

module.exports = mongoose.model('Course', courseSchema);
