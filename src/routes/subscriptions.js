const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const {
  createSubscription,
  getMySubscription,
  cancelSubscription,
  updateSubscription
} = require('../controllers/subscriptionController');

const router = express.Router();

// POST /api/subscriptions/create
router.post(
  '/create',
  authMiddleware,
  [
    body('plan')
      .isIn(['monthly', 'yearly'])
      .withMessage('Plan must be "monthly" or "yearly".')
  ],
  validate,
  createSubscription
);

// GET /api/subscriptions/my
router.get('/my', authMiddleware, getMySubscription);

// PUT /api/subscriptions/cancel
router.put('/cancel', authMiddleware, cancelSubscription);

// PUT /api/subscriptions/update
router.put(
  '/update',
  authMiddleware,
  [
    body('plan')
      .isIn(['monthly', 'yearly'])
      .withMessage('Plan must be "monthly" or "yearly".')
  ],
  validate,
  updateSubscription
);

module.exports = router;
