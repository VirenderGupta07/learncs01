const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateId: { type: String, required: true, unique: true },
    verificationCode: { type: String, required: true, unique: true },
    score: { type: Number, required: true },
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    pdfUrl: String,
    s3Key: String,
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A student can only ever hold one certificate per course.
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
