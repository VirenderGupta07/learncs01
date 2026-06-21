const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true }, // snapshot at purchase time
    price: { type: Number, required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'An order must contain at least one item',
      },
    },

    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponApplied: {
      code: String,
      discountType: { type: String, enum: ['percentage', 'flat'] },
      discountValue: Number,
    },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },

    paymentGateway: { type: String, enum: ['stripe', 'sslcommerz'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    stripe: {
      checkoutSessionId: String,
      paymentIntentId: String,
    },
    sslcommerz: {
      tranId: String,
      valId: String,
      bankTranId: String,
    },

    paidAt: Date,
    failureReason: String,
    ipAddress: String,
  },
  { timestamps: true }
);

orderSchema.index({ 'sslcommerz.tranId': 1 });

module.exports = mongoose.model('Order', orderSchema);
