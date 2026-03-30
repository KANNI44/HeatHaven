const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function register(req, res) {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email, password are required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone ? String(phone).trim() : null,
    passwordHash,
  });

  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

  const token = signToken(user._id);

  res.json({
    success: true,
    message: 'Logged in successfully!',
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
}

function me(req, res) {
  const u = req.user;
  res.json({ success: true, user: { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role } });
}

async function updateProfile(req, res) {
  const { name, phone } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('name email phone role');
  res.json({ success: true, message: 'Profile updated.', user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

  const user = await User.findById(req.user._id).select('passwordHash');
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ success: true, message: 'Password changed successfully.' });
}

module.exports = { register, login, me, updateProfile, changePassword };

