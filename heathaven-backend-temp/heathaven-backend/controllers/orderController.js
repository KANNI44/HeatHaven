const { body } = require('express-validator');
const pool = require('../config/db');
const { validate } = require('../middleware/error');

// ── GET /api/orders  (my orders) ─────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, a.line1, a.line2, a.city, a.state, a.pincode
         FROM orders o
    LEFT JOIN addresses a ON a.id = o.address_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.image_main
           FROM order_items oi
           JOIN product_variants pv ON pv.id = oi.variant_id
           JOIN products p          ON p.id  = pv.product_id
          WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
const getOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, a.line1, a.line2, a.city, a.state, a.pincode, a.country
         FROM orders o
    LEFT JOIN addresses a ON a.id = o.address_id
        WHERE o.id = ? AND (o.user_id = ? OR ? = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found.' });

    const order = rows[0];
    const [items] = await pool.query(
      `SELECT oi.*, p.image_main
         FROM order_items oi
         JOIN product_variants pv ON pv.id = oi.variant_id
         JOIN products p          ON p.id  = pv.product_id
        WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// ── POST /api/orders  (place order from cart) ─────────────────────────────────
const placeOrder = [
  body('address_id').optional().isInt(),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { address_id, notes } = req.body;
      const userId = req.user.id;

      // Fetch cart
      const [cartItems] = await conn.query(
        `SELECT ci.qty, pv.id AS variant_id, pv.sale_price, pv.stock,
                p.name, pv.size
           FROM cart_items ci
           JOIN product_variants pv ON pv.id = ci.variant_id
           JOIN products p          ON p.id  = pv.product_id
          WHERE ci.user_id = ? AND p.is_active = 1`,
        [userId]
      );

      if (!cartItems.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Your cart is empty.' });
      }

      // Check stock for all items
      for (const item of cartItems) {
        if (item.stock < item.qty) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${item.name} (${item.size}).`,
          });
        }
      }

      const subtotal = cartItems.reduce((sum, i) => sum + parseFloat(i.sale_price) * i.qty, 0);
      const shipping  = subtotal >= 50000 ? 0 : 1000;
      const total     = subtotal + shipping;

      // Create order
      const [orderResult] = await conn.query(
        `INSERT INTO orders (user_id, address_id, subtotal, shipping, total, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, address_id || null, subtotal, shipping, total, notes || null]
      );
      const orderId = orderResult.insertId;

      // Insert order items + decrement stock
      for (const item of cartItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, variant_id, product_name, size, price, qty)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.variant_id, item.name, item.size, item.sale_price, item.qty]
        );
        await conn.query(
          'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
          [item.qty, item.variant_id]
        );
      }

      // Clear cart
      await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      await conn.commit();

      res.status(201).json({
        success:  true,
        message:  'Order placed successfully! 🎉',
        orderId,
        total,
        shipping,
      });
    } catch (err) { await conn.rollback(); next(err); }
    finally { conn.release(); }
  },
];

// ── PUT /api/orders/:id/cancel ────────────────────────────────────────────────
const cancelOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [req.params.id]);

      // Restore stock
      const [items] = await conn.query('SELECT variant_id, qty FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items) {
        await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [item.qty, item.variant_id]);
      }
      await conn.commit();
      res.json({ success: true, message: 'Order cancelled.' });
    } catch (err) { await conn.rollback(); next(err); }
    finally { conn.release(); }
  } catch (err) { next(err); }
};

// ── GET /api/admin/orders  (admin) ────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';
    if (status) { where = 'WHERE o.status = ?'; params.push(status); }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email
         FROM orders o
         JOIN users u ON u.id = o.user_id
        ${where}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: orders, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── PUT /api/admin/orders/:id/status  (admin) ─────────────────────────────────
const updateOrderStatus = [
  body('status').isIn(['pending','confirmed','shipped','delivered','cancelled']),
  body('payment_status').optional().isIn(['unpaid','paid','refunded']),
  validate,
  async (req, res, next) => {
    try {
      const { status, payment_status } = req.body;
      await pool.query(
        `UPDATE orders
            SET status         = ?,
                payment_status = COALESCE(?, payment_status)
          WHERE id = ?`,
        [status, payment_status || null, req.params.id]
      );
      res.json({ success: true, message: 'Order status updated.' });
    } catch (err) { next(err); }
  },
];

module.exports = { getMyOrders, getOrder, placeOrder, cancelOrder, getAllOrders, updateOrderStatus };
