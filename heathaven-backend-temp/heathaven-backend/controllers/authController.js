const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body } = require('express-validator');
const pool   = require('../config/db');
const { validate } = require('../middleware/error');

// ── Helper: sign token ────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── Validation rules ──────────────────────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = [
  ...registerRules, validate,
  async (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body;

      // Check duplicate email
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
        [name, email, password_hash, phone || null]
      );

      const token = signToken(result.insertId);

      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: { id: result.insertId, name, email, phone: phone || null, role: 'user' },
      });
    } catch (err) { next(err); }
  },
];

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = [
  ...loginRules, validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, role, phone, avatar FROM users WHERE email = ?',
        [email]
      );
      if (!rows.length) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = signToken(user.id);
      const { password_hash: _, ...safeUser } = user;

      res.json({ success: true, message: 'Logged in successfully!', token, user: safeUser });
    } catch (err) { next(err); }
  },
];

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
const updateProfile = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().isMobilePhone(),
  validate,
  async (req, res, next) => {
    try {
      const { name, phone } = req.body;
      await pool.query(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name || null, phone || null, req.user.id]
      );
      const [rows] = await pool.query(
        'SELECT id, name, email, role, phone, avatar FROM users WHERE id = ?',
        [req.user.id]
      );
      res.json({ success: true, message: 'Profile updated.', user: rows[0] });
    } catch (err) { next(err); }
  },
];

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
const changePassword = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
      const match  = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) { next(err); }
  },
];

module.exports = { register, login, getMe, updateProfile, changePassword };
