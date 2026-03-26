const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  createScore,
  getMyScores,
  updateScore,
  deleteScore,
  getUserScores
} = require('../controllers/scoreController');

const router = express.Router();

// POST /api/scores
router.post(
  '/',
  authMiddleware,
  [
    body('score')
      .isInt({ min: 1, max: 45 })
      .withMessage('Score must be an integer between 1 and 45.'),
    body('played_date')
      .isISO8601()
      .withMessage('Played date must be a valid date (YYYY-MM-DD).')
  ],
  validate,
  createScore
);

// GET /api/scores/my
router.get('/my', authMiddleware, getMyScores);

// PUT /api/scores/:id
router.put(
  '/:id',
  authMiddleware,
  [
    body('score')
      .isInt({ min: 1, max: 45 })
      .withMessage('Score must be an integer between 1 and 45.'),
    body('played_date')
      .isISO8601()
      .withMessage('Played date must be a valid date (YYYY-MM-DD).')
  ],
  validate,
  updateScore
);

// DELETE /api/scores/:id
router.delete('/:id', authMiddleware, deleteScore);

// GET /api/scores/user/:userId (admin only)
router.get('/user/:userId', authMiddleware, adminMiddleware, getUserScores);

module.exports = router;
