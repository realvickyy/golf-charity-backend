const express = require('express');
const { getLandingStats, getDrawInfo } = require('../controllers/landingController');

const router = express.Router();

// Publicly accessible routes
router.get('/stats', getLandingStats);
router.get('/draw-info', getDrawInfo);

module.exports = router;
