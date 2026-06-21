const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    priceAtAddition: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    couponCode: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true }
);

cartSchema.methods.calculateSubtotal = function calculateSubtotal() {
  return this.items.reduce((sum, item) => sum + item.priceAtAddition, 0);
};

module.exports = mongoose.model('Cart', cartSchema);
