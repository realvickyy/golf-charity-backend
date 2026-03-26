const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const { register, login, logout, getMe, updateProfile } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('charity_id')
      .optional()
      .isUUID()
      .withMessage('Charity ID must be a valid UUID.'),
    body('contribution_percentage')
      .optional()
      .isFloat({ min: 10, max: 100 })
      .withMessage('Contribution percentage must be between 10 and 100.')
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required.')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required.')
  ],
  validate,
  login
);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', authMiddleware, getMe);

// PUT /api/auth/profile
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
