const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getMyWinnings,
  getAllWinners,
  uploadProof,
  verifyWinner,
  updatePayout
} = require('../controllers/winnerController');

const router = express.Router();

// GET /api/winners/my (auth required)
router.get('/my', authMiddleware, getMyWinnings);

// GET /api/winners (admin only)
router.get('/', authMiddleware, adminMiddleware, getAllWinners);

// POST /api/winners/:id/proof (auth required)
router.post(
  '/:id/proof',
  authMiddleware,
  [
    body('proof_url')
      .trim()
      .notEmpty()
      .withMessage('Proof URL is required.')
      .isURL()
      .withMessage('Proof URL must be a valid URL.')
  ],
  validate,
  uploadProof
);

// PUT /api/winners/:id/verify (admin only)
router.put(
  '/:id/verify',
  authMiddleware,
  adminMiddleware,
  [
    body('verification_status')
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('Verification status must be: pending, approved, or rejected.')
  ],
  validate,
  verifyWinner
);

// PUT /api/winners/:id/payout (admin only)
router.put(
  '/:id/payout',
  authMiddleware,
  adminMiddleware,
  [
    body('payout_status')
      .isIn(['pending', 'paid'])
      .withMessage('Payout status must be: pending or paid.')
  ],
  validate,
  updatePayout
);

module.exports = router;
