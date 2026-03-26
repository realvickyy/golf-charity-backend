const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getAllUsers,
  updateUser,
  getAnalytics,
  updateUserSubscription
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require auth + admin middleware
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users
router.get('/users', getAllUsers);

// PUT /api/admin/users/:id
router.put(
  '/users/:id',
  [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Valid email is required.')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be "user" or "admin".')
  ],
  validate,
  updateUser
);

// GET /api/admin/analytics
router.get('/analytics', getAnalytics);

// PUT /api/admin/users/:id/subscription
router.put(
  '/users/:id/subscription',
  [
    body('status')
      .isIn(['active', 'inactive', 'lapsed', 'cancelled'])
      .withMessage('Status must be: active, inactive, lapsed, or cancelled.')
  ],
  validate,
  updateUserSubscription
);

module.exports = router;
