const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    applicableCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // empty = all courses
    minOrderAmount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/**
 * Pure validation function - does NOT mutate usedCount. Incrementing usage
 * only happens once a payment is actually confirmed (see webhook.controller.js)
 * so abandoned checkouts never burn a real redemption.
 */
couponSchema.methods.isValidForOrder = function isValidForOrder(orderAmount, courseIds = []) {
  if (!this.isActive) return { valid: false, reason: 'This coupon is no longer active' };
  if (this.expiresAt && this.expiresAt < new Date()) {
    return { valid: false, reason: 'This coupon has expired' };
  }
  if (this.maxUses !== null && this.usedCount >= this.maxUses) {
    return { valid: false, reason: 'This coupon has reached its usage limit' };
  }
  if (orderAmount < this.minOrderAmount) {
    return { valid: false, reason: `A minimum order amount of ${this.minOrderAmount} is required` };
  }
  if (this.applicableCourses.length > 0) {
    const applicable = courseIds.some((id) =>
      this.applicableCourses.some((c) => c.toString() === id.toString())
    );
    if (!applicable) {
      return { valid: false, reason: 'This coupon is not valid for the selected course(s)' };
    }
  }
  return { valid: true };
};

module.exports = mongoose.model('Coupon', couponSchema);
