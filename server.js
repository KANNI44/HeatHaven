const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { seedAll } = require('./utils/seed');
const { errorHandler, notFound } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || ['http://localhost:5500', 'http://localhost:5000'],
    credentials: true,
  })
);
app.use(morgan('dev'));

app.use(express.json({ limit: '1mb' }));

// Serve the existing frontend files (HTML + images) from the repo root.
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Root landing page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    // Ensure demo catalog + admin user exist.
    return seedAll();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Heat Haven API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

