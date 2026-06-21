const Cart = require('../models/Cart.model');
const Course = require('../models/Course.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

exports.getCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.course', 'title thumbnail price slug');
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }
  res.status(200).json({ status: 'success', data: { cart } });
});

exports.addItem = catchAsync(async (req, res, next) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    return next(new ApiError('Course not found or unavailable', 404));
  }

  const alreadyOwned = req.user.purchasedCourses.some((entry) => entry.course.toString() === courseId);
  if (alreadyOwned) {
    return next(new ApiError('You already own this course', 400));
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const exists = cart.items.some((item) => item.course.toString() === courseId);
  if (!exists) {
    cart.items.push({ course: course._id, priceAtAddition: course.discountPrice ?? course.price });
    await cart.save();
  }

  res.status(200).json({ status: 'success', data: { cart } });
});

exports.removeItem = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new ApiError('Cart not found', 404));

  cart.items = cart.items.filter((item) => item.course.toString() !== req.params.courseId);
  await cart.save();

  res.status(200).json({ status: 'success', data: { cart } });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new ApiError('Cart not found', 404));

  cart.items = [];
  await cart.save();

  res.status(200).json({ status: 'success', data: { cart } });
});
