const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo, hasPermission } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.post(
  '/instructors',
  hasPermission('manageInstructors'),
  [body('name').notEmpty(), body('email').isEmail()],
  validateRequest,
  adminController.appointInstructor
);

router.get('/staff', adminController.listStaff);
// Super-Admin-only gate is enforced inside the controller itself (not via
// hasPermission), so granting permissions can never itself be delegated.
router.patch('/staff/:userId/permissions', adminController.updateStaffPermissions);
router.patch('/staff/:userId/status', adminController.setUserActiveStatus);

router.get('/coupons', hasPermission('manageCoupons'), adminController.listCoupons);
router.post(
  '/coupons',
  hasPermission('manageCoupons'),
  [body('code').notEmpty(), body('discountType').isIn(['percentage', 'flat']), body('discountValue').isFloat({ min: 0 })],
  validateRequest,
  adminController.createCoupon
);
router.patch('/coupons/:id/deactivate', hasPermission('manageCoupons'), adminController.deactivateCoupon);

module.exports = router;
