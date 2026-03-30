const { body } = require('express-validator');
const pool = require('../config/db');
const { validate } = require('../middleware/error');

const rules = [
  body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('pincode').trim().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required'),
  body('label').optional().trim(),
];

// GET /api/addresses
const getAddresses = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/addresses
const addAddress = [
  ...rules, validate,
  async (req, res, next) => {
    try {
      const { label, line1, line2, city, state, pincode, country, is_default } = req.body;
      if (is_default) {
        await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
      }
      const [result] = await pool.query(
        `INSERT INTO addresses (user_id, label, line1, line2, city, state, pincode, country, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, label || 'Home', line1, line2 || null, city, state, pincode, country || 'India', is_default ? 1 : 0]
      );
      res.status(201).json({ success: true, message: 'Address saved.', addressId: result.insertId });
    } catch (err) { next(err); }
  },
];

// PUT /api/addresses/:id
const updateAddress = [
  ...rules, validate,
  async (req, res, next) => {
    try {
      const { label, line1, line2, city, state, pincode, country, is_default } = req.body;
      if (is_default) {
        await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
      }
      await pool.query(
        `UPDATE addresses SET label=?, line1=?, line2=?, city=?, state=?, pincode=?, country=?, is_default=?
          WHERE id=? AND user_id=?`,
        [label || 'Home', line1, line2 || null, city, state, pincode, country || 'India', is_default ? 1 : 0, req.params.id, req.user.id]
      );
      res.json({ success: true, message: 'Address updated.' });
    } catch (err) { next(err); }
  },
];

// DELETE /api/addresses/:id
const deleteAddress = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Address removed.' });
  } catch (err) { next(err); }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress };
