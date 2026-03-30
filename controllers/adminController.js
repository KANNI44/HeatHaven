const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function adminLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || user.role !== 'admin') return res.status(401).json({ success: false, message: 'Admin credentials are invalid.' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Admin credentials are invalid.' });

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
}

async function listUsers(req, res) {
  const users = await User.find().select('name email phone role createdAt').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: users });
}

async function updateUser(req, res) {
  const userId = req.params.id;
  const { name, phone, role } = req.body || {};

  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (role !== undefined && ['user', 'admin'].includes(role)) updates.role = role;

  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('name email phone role').lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User updated.', data: user });
}

async function deleteUser(req, res) {
  const userId = req.params.id;
  const user = await User.findByIdAndDelete(userId).lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User deleted.' });
}

async function listAllOrders(req, res) {
  const { status, page = 1, limit = 20 } = req.query || {};
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const filter = {};
  if (status && ['pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled', 'payment_failed'].includes(status)) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { total, page: p, pages: Math.ceil(total / l) },
  });
}

async function updateOrderStatus(req, res) {
  const { status, paymentStatus } = req.body || {};
  const orderId = req.params.id;

  if (!status || !['pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled', 'payment_failed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  if (paymentStatus && !['unpaid', 'paid', 'failed'].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid paymentStatus.' });
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { status, ...(paymentStatus ? { 'payment.paymentStatus': paymentStatus } : {}) },
    { new: true }
  ).lean();

  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, message: 'Order status updated.', data: order });
}

module.exports = {
  adminLogin,
  listUsers,
  updateUser,
  deleteUser,
  listAllOrders,
  updateOrderStatus,
};

