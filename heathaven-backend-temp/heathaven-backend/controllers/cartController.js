const { body } = require('express-validator');
const pool = require('../config/db');
const { validate } = require('../middleware/error');

// ── Helper: fetch full cart for a user ────────────────────────────────────────
const fetchCart = async (userId) => {
  const [items] = await pool.query(
    `SELECT ci.id AS cart_item_id, ci.qty,
            pv.id AS variant_id, pv.size, pv.sale_price, pv.original_price, pv.stock,
            p.id  AS product_id, p.name, p.colorway, p.brand, p.image_main, p.is_on_sale
       FROM cart_items ci
       JOIN product_variants pv ON pv.id = ci.variant_id
       JOIN products         p  ON p.id  = pv.product_id
      WHERE ci.user_id = ? AND p.is_active = 1
      ORDER BY ci.added_at DESC`,
    [userId]
  );

  const subtotal = items.reduce((sum, i) => sum + i.sale_price * i.qty, 0);
  const shipping  = subtotal >= 50000 ? 0 : 1000;
  const total     = subtotal + shipping;

  return { items, subtotal, shipping, total, count: items.reduce((s, i) => s + i.qty, 0) };
};

// ── GET /api/cart ─────────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const cart = await fetchCart(req.user.id);
    res.json({ success: true, data: cart });
  } catch (err) { next(err); }
};

// ── POST /api/cart ────────────────────────────────────────────────────────────
const addToCart = [
  body('variant_id').isInt({ min: 1 }).withMessage('variant_id is required'),
  body('qty').optional().isInt({ min: 1, max: 10 }),
  validate,
  async (req, res, next) => {
    try {
      const { variant_id, qty = 1 } = req.body;

      // Verify variant exists and has stock
      const [variants] = await pool.query(
        'SELECT id, stock FROM product_variants WHERE id = ?', [variant_id]
      );
      if (!variants.length) return res.status(404).json({ success: false, message: 'Size/variant not found.' });
      if (variants[0].stock < qty) return res.status(400).json({ success: false, message: 'Not enough stock.' });

      // Upsert cart item
      await pool.query(
        `INSERT INTO cart_items (user_id, variant_id, qty)
              VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
        [req.user.id, variant_id, qty]
      );

      const cart = await fetchCart(req.user.id);
      res.status(201).json({ success: true, message: 'Added to cart!', data: cart });
    } catch (err) { next(err); }
  },
];

// ── PUT /api/cart/:cartItemId ─────────────────────────────────────────────────
const updateCartItem = [
  body('qty').isInt({ min: 1, max: 10 }).withMessage('qty must be between 1 and 10'),
  validate,
  async (req, res, next) => {
    try {
      const { qty } = req.body;
      const [result] = await pool.query(
        'UPDATE cart_items SET qty = ? WHERE id = ? AND user_id = ?',
        [qty, req.params.cartItemId, req.user.id]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Cart item not found.' });
      const cart = await fetchCart(req.user.id);
      res.json({ success: true, message: 'Cart updated.', data: cart });
    } catch (err) { next(err); }
  },
];

// ── DELETE /api/cart/:cartItemId ──────────────────────────────────────────────
const removeCartItem = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.cartItemId, req.user.id]);
    const cart = await fetchCart(req.user.id);
    res.json({ success: true, message: 'Item removed.', data: cart });
  } catch (err) { next(err); }
};

// ── DELETE /api/cart ──────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
