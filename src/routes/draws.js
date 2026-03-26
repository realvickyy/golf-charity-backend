const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getAllDraws,
  getLatestDraw,
  createDraw,
  simulate,
  publishDraw,
  getDrawEntries
} = require('../controllers/drawController');

const router = express.Router();

// GET /api/draws (admin only)
router.get('/', authMiddleware, adminMiddleware, getAllDraws);

// GET /api/draws/latest (public)
router.get('/latest', getLatestDraw);

// POST /api/draws (admin only)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('month')
      .trim()
      .notEmpty()
      .withMessage('Month is required.')
  ],
  validate,
  createDraw
);

// POST /api/draws/:id/simulate (admin only)
router.post('/:id/simulate', authMiddleware, adminMiddleware, simulate);

// POST /api/draws/:id/publish (admin only)
router.post('/:id/publish', authMiddleware, adminMiddleware, publishDraw);

// GET /api/draws/:id/entries (admin only)
router.get('/:id/entries', authMiddleware, adminMiddleware, getDrawEntries);

module.exports = router;
