require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const scoreRoutes = require('./routes/scores');
const { charityRouter, contributionRouter } = require('./routes/charities');
const drawRoutes = require('./routes/draws');
const winnerRoutes = require('./routes/winners');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// Global Middleware
// ========================================

// Security headers
app.use(helmet());

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
const allowedOrigins = [
  'http://localhost:3000',
  'https://golf-charity.vercel.app',
  frontendUrl
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// ========================================
// Rate Limiting
// ========================================

// Rate limiter for auth routes (10 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    data: null,
    message: 'Too many requests. Please try again after a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiter to auth routes
app.use('/api/auth', authLimiter);

// ========================================
// API Routes
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/charities', charityRouter);
app.use('/api/contributions', contributionRouter);
app.use('/api/draws', drawRoutes);
app.use('/api/winners', winnerRoutes);
app.use('/api/admin', adminRoutes);

// ========================================
// Health Check
// ========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    message: 'Server is running.'
  });
});

app.get('/health', (req, res) => res.redirect('/api/health'));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: { service: 'Golf Charity Platform API', version: '1.0' },
    message: 'Welcome to the Digital Heroes Golf Charity Platform API.'
  });
});

// ========================================
// 404 Handler
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route ${req.method} ${req.originalUrl} not found.`
  });
});

// ========================================
// Global Error Handler
// ========================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    data: null,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error.'
  });
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Digital Heroes - Golf Charity Platform API    ║
║──────────────────────────────────────────────────║
║    Server running on port ${PORT}                   ║
║    Environment: ${process.env.NODE_ENV || 'development'}                  ║
║    Frontend URL: ${process.env.FRONTEND_URL}       ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
