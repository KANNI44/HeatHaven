require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const { cartRouter, orderRouter, payRouter, addrRouter, wishRouter } = require('./routes/index');
const { errorHandler } = require('./middleware/error');

// ── Ensure DB pool is initialised early ──────────────────────────────────────
require('./config/db');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      30,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
}));

app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max:      120,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
// Razorpay webhook needs raw body for HMAC verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.body = JSON.parse(req.body);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/cart',      cartRouter);
app.use('/api/orders',    orderRouter);
app.use('/api/payment',   payRouter);
app.use('/api/addresses', addrRouter);
app.use('/api/wishlist',  wishRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Heat Haven API running on http://localhost:${PORT}`);
  console.log(`📋  Health check: http://localhost:${PORT}/health\n`);
});
