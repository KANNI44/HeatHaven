const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in environment');

  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
  mongoose.connection.on('error', err => console.error('❌ MongoDB error:', err.message));

  await mongoose.connect(uri);
}

module.exports = { connectDB };

