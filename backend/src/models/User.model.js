const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Granular admin-dashboard permissions.
 *
 * The Super Admin (isSuperAdmin: true) implicitly has every permission and
 * cannot be edited. All other 'admin' role users start with everything false
 * and the Super Admin grants specific capabilities to them individually -
 * this is what lets LearnCS01 have content-admins who can manage videos
 * without also being able to manage payouts, coupons, or other staff.
 */
const adminPermissionsSchema = new mongoose.Schema(
  {
    manageCourses: { type: Boolean, default: false },
    manageVideos: { type: Boolean, default: false }, // attach/replace YouTube or S3 lecture video
    manageInstructors: { type: Boolean, default: false },
    manageCoupons: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
    viewAnalytics: { type: Boolean, default: false },
    manageCertificates: { type: Boolean, default: false },
    moderateChat: { type: Boolean, default: false },
    manageOrders: { type: Boolean, default: false },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const courseProgressSchema = new mongoose.Schema(
  {
    completedLectures: [{ type: mongoose.Schema.Types.ObjectId }],
    quizAttempts: [quizAttemptSchema],
    bestScore: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    certificateIssued: { type: Boolean, default: false },
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const purchasedCourseSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    purchasedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },

    // Only meaningful when role === 'admin'.
    isSuperAdmin: { type: Boolean, default: false },
    permissions: { type: adminPermissionsSchema, default: () => ({}) },

    avatar: { type: String, default: '' },
    bio: { type: String, maxlength: 1000 },
    phone: { type: String },

    purchasedCourses: [purchasedCourseSchema],
    progress: {
      type: Map,
      of: courseProgressSchema,
      default: () => new Map(),
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false }, // true for instructor accounts created by admin

    passwordChangedAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) {
    // Subtract 1s so the JWT (issued just after save) is never treated as
    // pre-dating the password change due to clock granularity.
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  return jwtTimestamp < changedTimestamp;
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
