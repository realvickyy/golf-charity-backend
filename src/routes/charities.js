const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const supabase = require('../lib/supabase');
const {
  getCharities,
  getFeaturedCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity,
  createContribution,
  getMyContributions
} = require('../controllers/charityController');

const router = express.Router();

// GET /api/charities (public)
router.get('/', getCharities);

// GET /api/charities/featured (public)
router.get('/featured', getFeaturedCharities);

// GET /api/charities/:id (public)
router.get('/:id', getCharityById);

// POST /api/charities (admin only)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Charity name is required.')
  ],
  validate,
  createCharity
);

// PUT /api/charities/:id (admin only)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  updateCharity
);

// DELETE /api/charities/:id (admin only)
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  deleteCharity
);

// POST /api/charities/donations
router.post('/donations', authMiddleware, async (req, res) => {
  try {
    const { charity_id, amount } = req.body;
    if (!charity_id || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Valid charity_id and amount required.'
      });
    }

    // Verify charity exists
    const { data: charity, error } = await supabase
      .from('charities')
      .select('id, name')
      .eq('id', charity_id)
      .single();

    if (error || !charity) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Charity not found.'
      });
    }

    // Store donation record
    const { data: donation, error: donationError } = 
      await supabase
        .from('donations')
        .insert({
          user_id: req.user.id,
          charity_id,
          amount: parseFloat(amount),
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (donationError) throw donationError;

    return res.status(201).json({
      success: true,
      data: donation,
      message: `Donation of £${amount} to ${charity.name} recorded successfully.`
    });
  } catch (error) {
    console.error('Donation error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Failed to process donation.'
    });
  }
});

// ========================================
// Contribution routes (mounted at /api/contributions)
// ========================================
const contributionRouter = express.Router();

// POST /api/contributions
contributionRouter.post(
  '/',
  authMiddleware,
  [
    body('charity_id')
      .isUUID()
      .withMessage('Charity ID must be a valid UUID.'),
    body('percentage')
      .optional()
      .isFloat({ min: 10, max: 100 })
      .withMessage('Percentage must be between 10 and 100.')
  ],
  validate,
  createContribution
);

// GET /api/contributions/my
contributionRouter.get('/my', authMiddleware, getMyContributions);

module.exports = {
  charityRouter: router,
  contributionRouter
};
