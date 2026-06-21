const crypto = require('crypto');
const User = require('../models/User.model');
const Coupon = require('../models/Coupon.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const PERMISSION_KEYS = [
  'manageCourses',
  'manageVideos',
  'manageInstructors',
  'manageCoupons',
  'manageUsers',
  'viewAnalytics',
  'manageCertificates',
  'moderateChat',
  'manageOrders',
];

/** Super Admin appoints an instructor. A temporary password is returned once and never stored in plaintext. */
exports.appointInstructor = catchAsync(async (req, res, next) => {
  const { name, email, bio } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new ApiError('A user with this email already exists', 409));
  }

  const temporaryPassword = crypto.randomBytes(9).toString('base64url');

  const instructor = await User.create({
    name,
    email: email.toLowerCase(),
    password: temporaryPassword,
    role: 'instructor',
    bio,
    createdBy: req.user._id,
    mustChangePassword: true,
  });

  instructor.password = undefined;

  res.status(201).json({
    status: 'success',
    data: { instructor, temporaryPassword },
  });
});

/**
 * PATCH /api/v1/admin/staff/:userId/permissions
 *
 * This is the control point for "admin allows/gives permission so other
 * admin-dashboard users [see/do] only what they're granted" - deliberately
 * restricted to the Super Admin only (not a generic permission itself) so
 * that no admin can ever grant themselves or a peer broader access.
 */
exports.updateStaffPermissions = catchAsync(async (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return next(new ApiError('Only the Super Admin can modify staff permissions', 403));
  }

  const { userId } = req.params;
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== 'object') {
    return next(new ApiError('A valid permissions object is required', 400));
  }

  const staffUser = await User.findById(userId);
  if (!staffUser) {
    return next(new ApiError('Staff member not found', 404));
  }

  if (staffUser.role !== 'admin') {
    return next(new ApiError('Permissions can only be assigned to admin-dashboard staff', 400));
  }

  if (staffUser.isSuperAdmin) {
    return next(new ApiError('The Super Admin\'s permissions cannot be modified', 400));
  }

  const sanitizedPermissions = {};
  for (const key of PERMISSION_KEYS) {
    if (typeof permissions[key] === 'boolean') {
      sanitizedPermissions[key] = permissions[key];
    }
  }

  staffUser.permissions = { ...staffUser.permissions.toObject(), ...sanitizedPermissions };
  await staffUser.save();

  res.status(200).json({ status: 'success', data: { staffUser } });
});

/** Lists all admin-dashboard staff and their current permission grants, for the Super Admin's staff console. */
exports.listStaff = catchAsync(async (req, res) => {
  const staff = await User.find({ role: 'admin' }).select('name email permissions isSuperAdmin isActive createdAt');
  res.status(200).json({ status: 'success', data: { staff } });
});

/** Promotes/demotes a user's active status (suspend/reinstate). */
exports.setUserActiveStatus = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isActive: req.body.isActive }, { new: true });
  if (!user) return next(new ApiError('User not found', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

exports.createCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.create({
    ...req.body,
    code: req.body.code.toUpperCase(),
    createdBy: req.user._id,
  });
  res.status(201).json({ status: 'success', data: { coupon } });
});

exports.listCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.status(200).json({ status: 'success', data: { coupons } });
});

exports.deactivateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) return next(new ApiError('Coupon not found', 404));
  res.status(200).json({ status: 'success', data: { coupon } });
});
